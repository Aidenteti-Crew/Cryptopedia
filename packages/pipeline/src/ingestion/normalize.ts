import type { NormalizedArticle } from './contracts.js'

const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'source'])

export function normalizeUrl(input: string): string {
  const url = new URL(input)
  url.hash = ''
  url.hostname = url.hostname.toLowerCase()

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key)
    }
  }

  url.searchParams.sort()
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString()
}

// No type-prefix (e.g. "GUID:") is added here. content.article_raw.representative_key is
// shared with python_services/packages/news_collector's agent_comm ingestion path, which
// writes the raw article URL verbatim (see apps/api/.../agent-comm.service.ts insertArticle).
// A prefixed key would never collide with that path's key for the same article, defeating
// the shared uq_article_raw_representative_key_hash dedup guarantee across both pipelines.
export function buildRepresentativeKey(article: NormalizedArticle): string {
  if (article.guid?.trim()) return article.guid.trim()
  if (article.externalId?.trim()) return article.externalId.trim()
  if (article.canonicalUrl) return normalizeUrl(article.canonicalUrl)
  if (article.normalizedUrl) return normalizeUrl(article.normalizedUrl)
  return article.url
}
