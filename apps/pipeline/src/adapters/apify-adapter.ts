import type { SourceConfig } from '../config/source-config.js'
import type { AdapterCursor, CollectionResult, NormalizedArticle } from '../ingestion/contracts.js'
import { normalizeUrl } from '../ingestion/normalize.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

// Item shape of the apidojo/tweet-scraper actor. Other fields (counts, media, ...) are ignored.
interface TweetItem {
  id?: string
  url?: string
  text?: string
  createdAt?: string
  isRetweet?: boolean
  noResults?: boolean
}

const SYNC_TIMEOUT_MS = 310_000
const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|#x27);/g,
    (entity) => NAMED_ENTITIES[entity] ?? entity
  )
}

function parseTweetId(value: string | undefined): bigint | undefined {
  return value && /^\d+$/.test(value) ? BigInt(value) : undefined
}

function toArticle(
  source: SourceConfig,
  item: TweetItem,
  id: string
): NormalizedArticle | undefined {
  const publishedAt = item.createdAt ? new Date(item.createdAt) : undefined
  if (!item.url || !item.text || !publishedAt || Number.isNaN(publishedAt.getTime()))
    return undefined
  const text = decodeEntities(item.text).trim()
  // Posts with no letter or digit at all (emoji only) carry nothing to classify. Anything else,
  // however short, goes to the classifier, which files contentless posts as NOISE.
  if (!/[\p{L}\p{N}]/u.test(text)) return undefined
  const username = new URL(item.url).pathname.split('/').filter(Boolean)[0]
  return {
    sourceUrl: source.url,
    adapter: source.adapter,
    contentKind: source.contentKind,
    authority: source.authority,
    guid: id,
    title: text.length > 200 ? `${text.slice(0, 197)}...` : text,
    url: item.url,
    normalizedUrl: normalizeUrl(item.url),
    body: text,
    publishedAt: publishedAt.toISOString(),
    author: username,
  }
}

// Runs an Apify actor synchronously (run-sync-get-dataset-items) and maps the tweet items to
// articles. Retweets are skipped by default: their text is cut off mid-sentence ("RT @x: ...…")
// and the original posts come from the original accounts' own sources.
// Note: this actor scrapes x.com without the official X API; see architecture.md for the terms-
// of-service caveat that applies to that approach.
export class ApifyAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.apify.com',
    private readonly token: string | undefined = process.env.APIFY_TOKEN
  ) {}

  async collect(source: SourceConfig, cursor: AdapterCursor = {}): Promise<CollectionResult> {
    if (source.adapter !== 'APIFY' || !source.apify) {
      throw new Error('ApifyAdapter requires adapter=APIFY with apify config')
    }
    if (!this.token) throw new Error('APIFY_TOKEN is not configured')

    const items = await this.runActor(source.apify.actor, source.apify.input)
    // An active timeline always has recent posts, so a run that returns only "noResults"
    // placeholders means the actor was limited or blocked, not that there is nothing new. Report
    // it as a failure instead of "not modified" so it shows up in the source's health.
    if (items.length > 0 && items.every((item) => item.noResults)) {
      throw new Error(
        `Apify returned only "noResults" placeholders for ${source.apify.actor}: the actor may be rate-limited, blocked, or restricted on this plan`
      )
    }
    const seenAfter = parseTweetId(cursor.value)

    let newest = seenAfter
    const articles: NormalizedArticle[] = []
    let hasNew = false
    for (const item of items) {
      const id = parseTweetId(item.id)
      if (item.noResults || id === undefined) continue
      if (seenAfter !== undefined && id <= seenAfter) continue
      hasNew = true
      if (newest === undefined || id > newest) newest = id
      // The actor does not always set isRetweet (seen on a retweet in @Team1KOR's timeline),
      // so also recognise the "RT @user:" text prefix.
      const isRetweet = item.isRetweet === true || /^RT @/.test(item.text ?? '')
      if (isRetweet && !source.apify.includeRetweets) continue
      const article = toArticle(source, item, id.toString())
      if (article) articles.push(article)
      else
        console.warn(
          `[apify] skipping tweet ${id}: no url, no letters or digits, or no valid createdAt`
        )
    }

    if (!hasNew) return { status: 'NOT_MODIFIED', articles: [], cursor }
    return {
      status: 'SUCCESS',
      articles: articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
      cursor: { value: newest?.toString() },
    }
  }

  private async runActor(actor: string, input: Record<string, unknown>): Promise<TweetItem[]> {
    const path = `/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?format=json&clean=true`
    const response = await this.fetchFn(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    })
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Apify authentication failed (${response.status}): check APIFY_TOKEN`)
    }
    if (response.status === 402) {
      throw new Error('Apify usage limit reached (402): add credits or wait for the next cycle')
    }
    if (response.status === 404) {
      throw new Error(`Apify actor not found (404): ${actor}`)
    }
    if (response.status === 429) throw new Error('Apify rate limited (429)')
    if (!response.ok) {
      throw new Error(`Apify request failed: ${response.status} ${response.statusText} (${actor})`)
    }
    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) {
      throw new Error(`Apify returned an unexpected response shape for ${actor}`)
    }
    return payload as TweetItem[]
  }
}
