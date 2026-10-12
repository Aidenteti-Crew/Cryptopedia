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

// This must exactly match python_services/packages/news_collector's agent_comm ingestion
// contract, which stores the raw article URL in representative_key. Merely removing a
// "GUID:" prefix is insufficient: preferring an unprefixed feed GUID would still produce a
// different key from news_collector for every normal Atom entry. GUID/canonical/normalized
// hashes remain useful lookup signals, but the shared cross-pipeline conflict key is raw URL
// until both writers are migrated atomically to a new versioned contract.
export function buildRepresentativeKey(article: NormalizedArticle): string {
  return article.url
}
