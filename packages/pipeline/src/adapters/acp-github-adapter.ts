import type { SourceConfig } from '../config/source-config.js'
import type { AdapterCursor, CollectionResult, NormalizedArticle } from '../ingestion/contracts.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export const ACP_STATUSES = ['Proposed', 'Implementable', 'Activated', 'Stale'] as const
export type AcpStatus = (typeof ACP_STATUSES)[number]

export type AcpEventType =
  | 'ACP_CREATED'
  | 'ACP_CONTENT_UPDATED'
  | 'ACP_STATUS_CHANGED'
  | 'ACP_ACTIVATED'

export interface AcpMetadata {
  number: number
  title: string
  authors: string
  status: AcpStatus
  track: string
}

interface GitHubCommit {
  sha: string
  commit: { committer?: { date?: string }; author?: { date?: string } }
}

interface GitTreeEntry {
  path: string
  type: string
}

interface CompareFile {
  filename: string
  status: string
}

function tableValue(markdown: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(
    new RegExp(`^\\|\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*\\|\\s*(.*?)\\s*\\|\\s*$`, 'im')
  )
  return match?.[1]?.trim()
}

// ACP author cells are written as "Name ([@handle](https://github.com/handle)), ...". The link
// target is redundant (the GitHub handle is already visible) and, across 3-4 co-authors, easily
// pushes the plain-text length past content.article_raw.author's VARCHAR(255) — confirmed against
// 4 of the 36 real ACPs as of 2026-09-26. Keep the visible text, drop the URL.
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

export function parseAcpMetadata(markdown: string): AcpMetadata {
  const numberText = tableValue(markdown, 'ACP')
  const title = tableValue(markdown, 'Title')
  const rawAuthors = tableValue(markdown, 'Author(s)') ?? tableValue(markdown, 'Authors')
  const authors = rawAuthors ? stripMarkdownLinks(rawAuthors) : rawAuthors
  const statusText = tableValue(markdown, 'Status')
  const track = tableValue(markdown, 'Track')
  const status = ACP_STATUSES.find(
    (candidate) =>
      statusText !== undefined &&
      new RegExp(`^${candidate}(?:\\s|$|\\()`, 'i').test(statusText.trim())
  )

  if (!numberText || !/^\d+$/.test(numberText) || !title || !authors || !status || !track) {
    throw new Error('Invalid ACP preamble: ACP, Title, Author(s), Status and Track are required')
  }

  return { number: Number(numberText), title, authors, status, track }
}

export function classifyAcpEvent(
  previous: AcpMetadata | undefined,
  current: AcpMetadata
): AcpEventType {
  if (!previous) return 'ACP_CREATED'
  if (previous.status !== current.status) {
    return current.status === 'Activated' ? 'ACP_ACTIVATED' : 'ACP_STATUS_CHANGED'
  }
  return 'ACP_CONTENT_UPDATED'
}

function isAcpDocument(path: string): boolean {
  return /^ACPs\/[^/]+\/README\.md$/i.test(path)
}

function eventBody(event: AcpEventType, metadata: AcpMetadata, markdown: string): string {
  return [
    `Event: ${event}`,
    `ACP: ${metadata.number}`,
    `Status: ${metadata.status}`,
    `Track: ${metadata.track}`,
    `Authors: ${metadata.authors}`,
    '',
    markdown,
  ].join('\n')
}

export class AcpGitHubAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.github.com',
    private readonly owner = 'avalanche-foundation',
    private readonly repo = 'ACPs',
    private readonly branch = 'main',
    private readonly token = process.env.GITHUB_TOKEN
  ) {}

  async collect(source: SourceConfig, cursor: AdapterCursor = {}): Promise<CollectionResult> {
    if (source.adapter !== 'GITHUB_API') {
      throw new Error(`AcpGitHubAdapter cannot collect adapter=${source.adapter}`)
    }

    const headResponse = await this.request(
      `/repos/${this.owner}/${this.repo}/commits/${this.branch}`,
      {
        etag: cursor.etag,
      }
    )
    if (headResponse.status === 304) {
      return { status: 'NOT_MODIFIED', articles: [], cursor }
    }
    const head = await this.json<GitHubCommit>(headResponse)
    if (head.sha === cursor.value) {
      return {
        status: 'NOT_MODIFIED',
        articles: [],
        cursor: { ...cursor, etag: headResponse.headers.get('etag') ?? cursor.etag },
      }
    }

    const paths = cursor.value
      ? await this.changedPaths(cursor.value, head.sha)
      : await this.initialPaths(head.sha)
    const publishedAt =
      head.commit.committer?.date ?? head.commit.author?.date ?? new Date().toISOString()
    const articles: NormalizedArticle[] = []

    for (const path of paths) {
      const markdown = await this.rawFile(path, head.sha)
      if (markdown === undefined)
        throw new Error(`ACP document disappeared at ${head.sha}: ${path}`)
      let metadata: AcpMetadata
      try {
        metadata = parseAcpMetadata(markdown)
      } catch (error) {
        throw new Error(
          `Failed to parse ACP document ${path}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        )
      }
      let previous: AcpMetadata | undefined
      if (cursor.value) {
        const previousMarkdown = await this.rawFile(path, cursor.value, true)
        if (previousMarkdown !== undefined) {
          try {
            previous = parseAcpMetadata(previousMarkdown)
          } catch (error) {
            throw new Error(
              `Failed to parse previous ACP document ${path}@${cursor.value}: ${error instanceof Error ? error.message : String(error)}`,
              { cause: error }
            )
          }
        }
      }
      const event = classifyAcpEvent(previous, metadata)
      const canonicalUrl = `https://github.com/${this.owner}/${this.repo}/blob/${this.branch}/${path}`
      const eventUrl = `https://github.com/${this.owner}/${this.repo}/blob/${head.sha}/${path}`

      articles.push({
        sourceUrl: source.url,
        adapter: source.adapter,
        contentKind: source.contentKind,
        authority: source.authority,
        externalId: `ACP-${metadata.number}@${head.sha}`,
        title: `[${event}] ACP-${metadata.number}: ${metadata.title}`,
        url: eventUrl,
        normalizedUrl: eventUrl,
        canonicalUrl,
        body: eventBody(event, metadata, markdown),
        publishedAt,
        author: metadata.authors,
      })
    }

    return {
      status: 'SUCCESS',
      articles,
      cursor: {
        value: head.sha,
        etag: headResponse.headers.get('etag') ?? cursor.etag,
      },
    }
  }

  private async initialPaths(sha: string): Promise<string[]> {
    const response = await this.request(
      `/repos/${this.owner}/${this.repo}/git/trees/${sha}?recursive=1`
    )
    const tree = await this.json<{ tree: GitTreeEntry[]; truncated?: boolean }>(response)
    if (tree.truncated) throw new Error('ACP repository tree response was truncated')
    return tree.tree
      .filter((entry) => entry.type === 'blob' && isAcpDocument(entry.path))
      .map((entry) => entry.path)
      .sort()
  }

  private async changedPaths(base: string, head: string): Promise<string[]> {
    const response = await this.request(
      `/repos/${this.owner}/${this.repo}/compare/${base}...${head}`
    )
    const comparison = await this.json<{ files?: CompareFile[] }>(response)
    return (comparison.files ?? [])
      .filter((file) => file.status !== 'removed' && isAcpDocument(file.filename))
      .map((file) => file.filename)
      .sort()
  }

  private async rawFile(
    path: string,
    ref: string,
    missingIsUndefined = false
  ): Promise<string | undefined> {
    const response = await this.request(
      `/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path).replaceAll('%2F', '/')}?ref=${encodeURIComponent(ref)}`,
      { accept: 'application/vnd.github.raw+json', allowNotFound: missingIsUndefined }
    )
    if (response.status === 404 && missingIsUndefined) return undefined
    return response.text()
  }

  private async request(
    path: string,
    options: { accept?: string; allowNotFound?: boolean; etag?: string } = {}
  ): Promise<Response> {
    const headers = new Headers({
      Accept: options.accept ?? 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cryptopedia-crawler',
    })
    if (options.etag) headers.set('If-None-Match', options.etag)
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`)
    const response = await this.fetchFn(`${this.apiBase}${path}`, { headers })
    if (response.status === 404 && options.allowNotFound) return response
    if (!response.ok && response.status !== 304) {
      throw new Error(
        `GitHub API request failed: ${response.status} ${response.statusText} (${path})`
      )
    }
    return response
  }

  private async json<T>(response: Response): Promise<T> {
    return (await response.json()) as T
  }
}
