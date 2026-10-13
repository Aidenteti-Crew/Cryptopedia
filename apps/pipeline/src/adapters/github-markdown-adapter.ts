import { load } from 'js-yaml'

import type { GithubMarkdownLocation, SourceConfig } from '../config/source-config.js'
import type { AdapterCursor, CollectionResult, NormalizedArticle } from '../ingestion/contracts.js'
import { normalizeUrl } from '../ingestion/normalize.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

interface GitHubCommit {
  sha: string
}

interface GitTreeEntry {
  path: string
  type: string
}

interface CompareFile {
  filename: string
  status: string
}

export interface ParsedMarkdownPost {
  title: string
  description: string
  publishedAt: string
  authors: string
  body: string
}

const POST_FILE = /\.mdx?$/i

function frontmatterText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function frontmatterDate(value: unknown): string | undefined {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined
}

// Splits "---\nyaml\n---\nbody" into parsed frontmatter and body. Shared by blog posts (this
// file) and the project directory adapter, whose entries have no date.
export function parseFrontmatter(source: string): {
  meta: Record<string, unknown>
  content: string
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error('missing YAML frontmatter')
  const meta = load(match[1] ?? '')
  return {
    meta: meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {},
    content: match[2] ?? '',
  }
}

export { frontmatterText }

// Posts live as MDX with YAML frontmatter (title, description, date, authors, topics). The MDX
// body also carries JSX import lines for site components, which are noise as plain text.
export function parseMarkdownPost(source: string): ParsedMarkdownPost {
  const { meta, content: rawContent } = parseFrontmatter(source)
  const title = frontmatterText(meta.title)
  const publishedAt = frontmatterDate(meta.date)
  if (!title) throw new Error('frontmatter is missing title')
  if (!publishedAt) throw new Error('frontmatter is missing a valid date')

  const authors = Array.isArray(meta.authors)
    ? meta.authors.filter((a): a is string => typeof a === 'string').join(', ')
    : (frontmatterText(meta.authors) ?? '')
  const description = frontmatterText(meta.description) ?? ''
  const content = rawContent
    .split('\n')
    .filter((line) => !/^import\s/.test(line))
    .join('\n')
    .trim()

  return {
    title,
    description,
    publishedAt,
    authors,
    body: [description, content].filter(Boolean).join('\n\n'),
  }
}

function slugOf(path: string): string {
  return (path.split('/').pop() ?? path).replace(POST_FILE, '')
}

function isPostPath(path: string, dir: string): boolean {
  const prefix = `${dir.replace(/\/+$/, '')}/`
  return path.startsWith(prefix) && !path.slice(prefix.length).includes('/') && POST_FILE.test(path)
}

// Collects blog posts from a site whose content is open-sourced as markdown in a GitHub repo, so
// no scraping or AI-derived selectors are needed. The article URL is the stable public post URL
// (<source.url>/<slug>) rather than a commit-pinned one: a post is one article, and later edits
// should be deduplicated by the shared representative_key, not stored as new rows.
export class GithubMarkdownAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.github.com',
    private readonly token: string | undefined = process.env.GITHUB_TOKEN
  ) {}

  async collect(source: SourceConfig, cursor: AdapterCursor = {}): Promise<CollectionResult> {
    if (source.adapter !== 'GITHUB_MARKDOWN' || !source.github) {
      throw new Error(`GithubMarkdownAdapter requires adapter=GITHUB_MARKDOWN with github config`)
    }
    const location = source.github
    const repoPath = `/repos/${location.owner}/${location.repo}`

    const headResponse = await this.request(
      `${repoPath}/commits/${encodeURIComponent(location.branch)}`,
      cursor.etag
    )
    if (headResponse.status === 304) {
      return { status: 'NOT_MODIFIED', articles: [], cursor }
    }
    const head = (await headResponse.json()) as GitHubCommit
    const etag = headResponse.headers.get('etag') ?? cursor.etag
    if (head.sha === cursor.value) {
      return { status: 'NOT_MODIFIED', articles: [], cursor: { ...cursor, etag } }
    }

    const paths = cursor.value
      ? await this.addedPaths(repoPath, location, cursor.value, head.sha)
      : await this.allPaths(repoPath, location, head.sha)

    const articles: NormalizedArticle[] = []
    for (const path of paths) {
      const markdown = await this.rawFile(repoPath, path, head.sha)
      try {
        articles.push(this.toArticle(source, path, parseMarkdownPost(markdown)))
      } catch (error) {
        console.warn(
          `[github-markdown] skipping ${path}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return { status: 'SUCCESS', articles, cursor: { value: head.sha, etag } }
  }

  private toArticle(
    source: SourceConfig,
    path: string,
    post: ParsedMarkdownPost
  ): NormalizedArticle {
    const url = `${source.url.replace(/\/+$/, '')}/${slugOf(path)}`
    return {
      sourceUrl: source.url,
      adapter: source.adapter,
      contentKind: source.contentKind,
      authority: source.authority,
      guid: path,
      title: post.title,
      url,
      normalizedUrl: normalizeUrl(url),
      body: post.body,
      publishedAt: post.publishedAt,
      author: post.authors || undefined,
    }
  }

  private async allPaths(
    repoPath: string,
    location: GithubMarkdownLocation,
    sha: string
  ): Promise<string[]> {
    const response = await this.request(`${repoPath}/git/trees/${sha}?recursive=1`)
    const tree = (await response.json()) as { tree: GitTreeEntry[]; truncated?: boolean }
    if (tree.truncated) throw new Error('GitHub tree response was truncated')
    return tree.tree
      .filter((entry) => entry.type === 'blob' && isPostPath(entry.path, location.path))
      .map((entry) => entry.path)
      .sort()
  }

  // Only newly added (or renamed-in) posts are new articles. Edits to existing posts keep the
  // same URL and would be dropped by the dedup index anyway, so they aren't re-fetched.
  private async addedPaths(
    repoPath: string,
    location: GithubMarkdownLocation,
    base: string,
    head: string
  ): Promise<string[]> {
    const response = await this.request(`${repoPath}/compare/${base}...${head}`)
    const comparison = (await response.json()) as { files?: CompareFile[] }
    return (comparison.files ?? [])
      .filter(
        (file) =>
          (file.status === 'added' || file.status === 'renamed') &&
          isPostPath(file.filename, location.path)
      )
      .map((file) => file.filename)
      .sort()
  }

  private async rawFile(repoPath: string, path: string, ref: string): Promise<string> {
    const response = await this.request(
      `${repoPath}/contents/${encodeURIComponent(path).replaceAll('%2F', '/')}?ref=${encodeURIComponent(ref)}`,
      undefined,
      'application/vnd.github.raw+json'
    )
    return response.text()
  }

  private async request(path: string, etag?: string, accept?: string): Promise<Response> {
    const headers = new Headers({
      Accept: accept ?? 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cryptopedia-crawler',
    })
    if (etag) headers.set('If-None-Match', etag)
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`)
    const response = await this.fetchFn(`${this.apiBase}${path}`, { headers })
    if (!response.ok && response.status !== 304) {
      throw new Error(
        `GitHub API request failed: ${response.status} ${response.statusText} (${path})`
      )
    }
    return response
  }
}
