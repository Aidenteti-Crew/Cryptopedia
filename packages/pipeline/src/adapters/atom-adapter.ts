import { XMLParser } from 'fast-xml-parser'

import type { SourceConfig } from '../config/source-config.js'
import type { AdapterCursor, CollectionResult, NormalizedArticle } from '../ingestion/contracts.js'
import { normalizeUrl } from '../ingestion/normalize.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

interface AtomEntry {
  id?: string
  title?: string | { '#text'?: string }
  updated?: string
  published?: string
  content?: string | { '#text'?: string }
  summary?: string | { '#text'?: string }
  author?: { name?: string }
  link?: Array<{ '@_href'?: string; '@_rel'?: string }> | { '@_href'?: string; '@_rel'?: string }
}

function text(value: string | { '#text'?: string } | undefined): string {
  if (typeof value === 'string') return value
  return value?.['#text'] ?? ''
}

function entryUrl(entry: AtomEntry): string {
  const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : []
  return links.find((link) => !link['@_rel'] || link['@_rel'] === 'alternate')?.['@_href'] ?? ''
}

function parseEntries(xml: string, source: SourceConfig): NormalizedArticle[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
    // fast-xml-parser's entity-expansion DoS guard defaults to 1000 total expansions per
    // document. A GitHub releases feed with several entries' worth of HTML-escaped PR/issue
    // links (each &lt;a ...&gt;...&lt;/a&gt; is several entities) can legitimately exceed that —
    // ava-labs/subnet-evm's feed alone has ~10,760 as of 2026-09-26. Raised well past that with
    // headroom, not disabled: the per-entity maxEntitySize/maxExpandedLength guards (10 KiB /
    // 100 KiB, library defaults) still bound a single malicious entity regardless of this count.
    processEntities: { maxTotalExpansions: 20000 },
  })
  const document = parser.parse(xml) as { feed?: { entry?: AtomEntry | AtomEntry[] } }
  const rawEntries = document.feed?.entry
  const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : []

  return entries.map((entry) => {
    const url = entryUrl(entry)
    const publishedAt = entry.published ?? entry.updated ?? ''
    return {
      sourceUrl: source.url,
      adapter: source.adapter,
      contentKind: source.contentKind,
      authority: source.authority,
      externalId: entry.id,
      guid: entry.id,
      title: text(entry.title),
      url,
      normalizedUrl: normalizeUrl(url),
      canonicalUrl: normalizeUrl(url),
      body: text(entry.content) || text(entry.summary),
      publishedAt,
      updatedAt: entry.updated,
      author: entry.author?.name,
    }
  })
}

export class AtomAdapter {
  constructor(private readonly fetchFn: FetchLike = fetch) {}

  async collect(source: SourceConfig, cursor: AdapterCursor = {}): Promise<CollectionResult> {
    if (source.adapter !== 'ATOM') {
      throw new Error(`AtomAdapter cannot collect adapter=${source.adapter}`)
    }

    const headers = new Headers({ Accept: 'application/atom+xml, application/xml;q=0.9' })
    if (cursor.etag) headers.set('If-None-Match', cursor.etag)
    if (cursor.lastModified) headers.set('If-Modified-Since', cursor.lastModified)

    const response = await this.fetchFn(source.url, { headers })
    if (response.status === 304) {
      return { status: 'NOT_MODIFIED', articles: [], cursor }
    }
    if (!response.ok) {
      throw new Error(`Atom fetch failed: ${response.status} ${response.statusText}`)
    }

    const articles = parseEntries(await response.text(), source)
    return {
      status: 'SUCCESS',
      articles,
      cursor: {
        value: articles.at(0)?.guid ?? cursor.value,
        etag: response.headers.get('etag') ?? cursor.etag,
        lastModified: response.headers.get('last-modified') ?? cursor.lastModified,
      },
    }
  }
}
