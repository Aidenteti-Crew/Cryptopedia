import type { ContentEntry } from './cryptopedia-types'
import { filterFeed } from './editorial-discovery'

export type ReleaseProduct = { id: string; name: string; entries: ContentEntry[] }

export function isReleaseCandidate(entry: ContentEntry) {
  return entry.subKind === 'RELEASE' && (entry.prerelease === true || entry.prerelease == null && /(?:^|[-.])(rc|alpha|beta|preview|dev)(?:[.-]|\d|$)/i.test(entry.version ?? ''))
}

export function getReleaseProducts(entries: ContentEntry[]): ReleaseProduct[] {
  const products = new Map<string, ReleaseProduct>()
  for (const entry of entries) {
    if (entry.subKind !== 'RELEASE') continue
    let repo: string | undefined
    try {
      const url = new URL(entry.sourceUrl ?? '')
      if (url.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/releases(?:\/|$)/.test(url.pathname)) {
        repo = url.pathname.split('/').slice(1, 3).join('/')
      }
    } catch { /* Source URL is optional; retain the source's own identity below. */ }
    const id = repo ? `github:${repo.toLowerCase()}` : entry.sourceName ? `source:${entry.sourceName}` : `unknown:${entry.id}`
    const name = entry.sourceName?.replace(/\s+Releases$/i, '') ?? repo?.split('/')[1] ?? `출처 미제공 · ${entry.title}`
    const product = products.get(id) ?? { id, name, entries: [] }
    product.entries.push(entry)
    products.set(id, product)
  }
  return [...products.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function selectReleaseHistory(entries: ContentEntry[], options: {
  query: string; from: string; to: string; sort: 'latest' | 'oldest'; includeCandidates: boolean
}) {
  return filterFeed(entries, { query: options.query, source: 'all', kind: 'RELEASE', period: 'all', from: options.from, to: options.to })
    .filter((entry) => options.includeCandidates || !isReleaseCandidate(entry))
    .sort((a, b) => {
      const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0
      const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0
      return (options.sort === 'latest' ? bDate - aDate : aDate - bDate) || a.id.localeCompare(b.id)
    })
}
