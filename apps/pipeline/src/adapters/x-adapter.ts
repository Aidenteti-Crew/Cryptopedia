import type { SourceConfig } from '../config/source-config.js'
import type { AdapterCursor, CollectionResult, NormalizedArticle } from '../ingestion/contracts.js'
import { normalizeUrl } from '../ingestion/normalize.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

interface XTweet {
  id: string
  text: string
  created_at?: string
}

interface XUserLookup {
  data?: { id: string; username: string }
}

interface XTweetsResponse {
  data?: XTweet[]
  meta?: { newest_id?: string; result_count?: number }
}

const MAX_RESULTS = 20

function extractUsername(sourceUrl: string): string {
  const path = new URL(sourceUrl).pathname.replace(/^\/+|\/+$/g, '')
  if (!path) throw new Error(`X source URL has no username: ${sourceUrl}`)
  return path.split('/')[0]!
}

function toArticle(source: SourceConfig, username: string, tweet: XTweet): NormalizedArticle {
  const url = `https://x.com/${username}/status/${tweet.id}`
  const title = tweet.text.length > 200 ? `${tweet.text.slice(0, 197)}...` : tweet.text
  return {
    sourceUrl: source.url,
    adapter: source.adapter,
    contentKind: source.contentKind,
    authority: source.authority,
    guid: tweet.id,
    title,
    url,
    normalizedUrl: normalizeUrl(url),
    body: tweet.text,
    publishedAt: tweet.created_at ?? new Date().toISOString(),
    author: username,
  }
}

// API-only, per architecture.md §5.5 — browser-use is reserved for a fallback that isn't wired
// up here, since scraping x.com directly without the API violates its terms of service (see the
// legality discussion earlier in this project: X actively enforces against unauthorized scraping).
export class XApiAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.x.com',
    private readonly bearerToken: string | undefined = process.env.X_BEARER_TOKEN
  ) {}

  async collect(source: SourceConfig, cursor: AdapterCursor = {}): Promise<CollectionResult> {
    if (source.adapter !== 'X_API') {
      throw new Error(`XApiAdapter cannot collect adapter=${source.adapter}`)
    }

    const username = extractUsername(source.url)
    // Re-resolved on every call rather than cached in the cursor: the user-lookup endpoint has
    // its own, separate rate-limit bucket from the tweets-timeline endpoint on the X API, so
    // this doesn't compete with the budget that actually constrains how often we can poll.
    const userId = await this.resolveUserId(username)

    const params = new URLSearchParams({
      max_results: String(MAX_RESULTS),
      exclude: 'retweets',
      'tweet.fields': 'created_at',
    })
    if (cursor.value) params.set('since_id', cursor.value)

    const response = await this.request(`/2/users/${userId}/tweets?${params.toString()}`)
    const payload = await this.json<XTweetsResponse>(response)
    const tweets = payload.data ?? []

    if (tweets.length === 0) {
      return { status: 'NOT_MODIFIED', articles: [], cursor }
    }

    const articles = tweets.map((tweet) => toArticle(source, username, tweet))
    const newestId = payload.meta?.newest_id ?? tweets[0]!.id
    return { status: 'SUCCESS', articles, cursor: { value: newestId } }
  }

  private async resolveUserId(username: string): Promise<string> {
    const response = await this.request(`/2/users/by/username/${encodeURIComponent(username)}`)
    const payload = await this.json<XUserLookup>(response)
    if (!payload.data?.id) {
      throw new Error(`X user not found: ${username}`)
    }
    return payload.data.id
  }

  private async request(path: string): Promise<Response> {
    if (!this.bearerToken) {
      throw new Error('X_BEARER_TOKEN is not configured')
    }
    const response = await this.fetchFn(`${this.apiBase}${path}`, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    })
    if (response.status === 401) {
      throw new Error('X API authentication failed (401): check X_BEARER_TOKEN')
    }
    if (response.status === 429) {
      const resetHeader = response.headers.get('x-rate-limit-reset')
      throw new Error(
        `X API rate limited (429)${resetHeader ? `, resets at epoch ${resetHeader}` : ''}`
      )
    }
    if (!response.ok) {
      throw new Error(`X API request failed: ${response.status} ${response.statusText} (${path})`)
    }
    return response
  }

  private async json<T>(response: Response): Promise<T> {
    return (await response.json()) as T
  }
}
