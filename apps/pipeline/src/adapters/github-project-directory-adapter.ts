import type { GithubMarkdownLocation, SourceConfig } from '../config/source-config.js'
import type { AdapterCursor } from '../ingestion/contracts.js'
import { frontmatterText, parseFrontmatter } from './github-markdown-adapter.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface EcoProjectRecord {
  externalKey: string
  name: string
  category: string | null
  developer: string | null
  websiteUrl: string | null
  documentationUrl: string | null
  description: string | null
  chains: string[]
  sourceUrl: string
}

export interface DirectoryCollectionResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  projects: EcoProjectRecord[]
  removedKeys: string[]
  cursor: AdapterCursor
}

interface CompareFile {
  filename: string
  status: string
  previous_filename?: string
}

const ENTRY_FILE = /\.mdx$/i

function keyOf(path: string): string {
  return (path.split('/').pop() ?? path).replace(ENTRY_FILE, '')
}

function isEntryPath(path: string, dir: string): boolean {
  const prefix = `${dir.replace(/\/+$/, '')}/`
  return (
    path.startsWith(prefix) && !path.slice(prefix.length).includes('/') && ENTRY_FILE.test(path)
  )
}

export function parseProjectEntry(
  markdown: string,
  externalKey: string,
  sourceUrl: string
): EcoProjectRecord {
  const { meta } = parseFrontmatter(markdown)
  const name = frontmatterText(meta.title)
  if (!name) throw new Error('frontmatter is missing title')
  const available = Array.isArray(meta.available)
    ? meta.available.filter((chain): chain is string => typeof chain === 'string')
    : []
  return {
    externalKey,
    name,
    category: frontmatterText(meta.category) ?? null,
    developer: frontmatterText(meta.developer) ?? null,
    websiteUrl: frontmatterText(meta.website) ?? null,
    documentationUrl: frontmatterText(meta.documentation) ?? null,
    description: frontmatterText(meta.description) ?? null,
    chains: available,
    sourceUrl,
  }
}

// Reads a directory of project entries (one MDX file each, with YAML frontmatter) from a GitHub
// repo. Same cursor model as the other GitHub adapters: head commit sha + ETag, the whole tree on
// the first run, then only files added/changed/removed since the stored sha.
export class GithubProjectDirectoryAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.github.com',
    private readonly token: string | undefined = process.env.GITHUB_TOKEN
  ) {}

  async collect(
    source: SourceConfig,
    cursor: AdapterCursor = {}
  ): Promise<DirectoryCollectionResult> {
    if (source.adapter !== 'GITHUB_DIRECTORY' || !source.github) {
      throw new Error(
        'GithubProjectDirectoryAdapter requires adapter=GITHUB_DIRECTORY with github config'
      )
    }
    const location = source.github
    const repoPath = `/repos/${location.owner}/${location.repo}`

    const headResponse = await this.request(
      `${repoPath}/commits/${encodeURIComponent(location.branch)}`,
      cursor.etag
    )
    if (headResponse.status === 304) {
      return { status: 'NOT_MODIFIED', projects: [], removedKeys: [], cursor }
    }
    const head = (await headResponse.json()) as { sha: string }
    const etag = headResponse.headers.get('etag') ?? cursor.etag
    if (head.sha === cursor.value) {
      return { status: 'NOT_MODIFIED', projects: [], removedKeys: [], cursor: { ...cursor, etag } }
    }

    const { changed, removedKeys } = cursor.value
      ? await this.changes(repoPath, location, cursor.value, head.sha)
      : { changed: await this.allPaths(repoPath, location, head.sha), removedKeys: [] }

    const projects: EcoProjectRecord[] = []
    for (const path of changed) {
      const key = keyOf(path)
      const markdown = await this.rawFile(repoPath, path, head.sha)
      try {
        projects.push(parseProjectEntry(markdown, key, `${source.url.replace(/\/+$/, '')}/${key}`))
      } catch (error) {
        console.warn(
          `[github-directory] skipping ${path}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
    return { status: 'SUCCESS', projects, removedKeys, cursor: { value: head.sha, etag } }
  }

  private async allPaths(
    repoPath: string,
    location: GithubMarkdownLocation,
    sha: string
  ): Promise<string[]> {
    const response = await this.request(`${repoPath}/git/trees/${sha}?recursive=1`)
    const tree = (await response.json()) as {
      tree: { path: string; type: string }[]
      truncated?: boolean
    }
    if (tree.truncated) throw new Error('GitHub tree response was truncated')
    return tree.tree
      .filter((entry) => entry.type === 'blob' && isEntryPath(entry.path, location.path))
      .map((entry) => entry.path)
      .sort()
  }

  private async changes(
    repoPath: string,
    location: GithubMarkdownLocation,
    base: string,
    head: string
  ): Promise<{ changed: string[]; removedKeys: string[] }> {
    const response = await this.request(`${repoPath}/compare/${base}...${head}`)
    const comparison = (await response.json()) as { files?: CompareFile[] }
    const files = (comparison.files ?? []).filter(
      (file) =>
        isEntryPath(file.filename, location.path) ||
        (file.previous_filename && isEntryPath(file.previous_filename, location.path))
    )
    const changed = files
      .filter((file) => file.status !== 'removed' && isEntryPath(file.filename, location.path))
      .map((file) => file.filename)
    const removedKeys = files.flatMap((file) => {
      if (file.status === 'removed' && isEntryPath(file.filename, location.path)) {
        return [keyOf(file.filename)]
      }
      if (file.status === 'renamed' && file.previous_filename) {
        return [keyOf(file.previous_filename)]
      }
      return []
    })
    return { changed: changed.sort(), removedKeys }
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
