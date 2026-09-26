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

export function buildRepresentativeKey(article: NormalizedArticle): string {
  if (article.guid?.trim()) return `GUID:${article.guid.trim()}`
  if (article.externalId?.trim()) return `EXTERNAL:${article.externalId.trim()}`
  if (article.canonicalUrl) return `CANO:${normalizeUrl(article.canonicalUrl)}`
  if (article.normalizedUrl) return `NORM:${normalizeUrl(article.normalizedUrl)}`
  return `URL:${normalizeUrl(article.url)}`
}
