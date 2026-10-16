import type { ContentEntry } from './cryptopedia-types'
import { calendarDay, filterFeed } from './editorial-discovery'
import { isReleaseCandidate } from './development-updates'

export const PRODUCTS = {
  avalanchego: 'AvalancheGo',
  coreth: 'Coreth',
  'subnet-evm': 'Subnet-EVM',
} as const
export const CHANGE_LABELS = {
  protocol: '프로토콜 업그레이드',
  mandatory: '필수 업데이트',
  breaking: '호환성 변경',
  security: '보안 수정',
} as const
export const NETWORK_LABELS: Record<string, string> = {
  MAINNET: 'Mainnet',
  FUJI: 'Fuji Testnet',
  BOTH: 'Mainnet · Fuji',
  OTHER: '기타',
  NA: '해당 없음',
  UNKNOWN: '미확인',
}

export function updateNetwork(entry: ContentEntry) {
  return entry.network && Object.hasOwn(NETWORK_LABELS, entry.network) ? entry.network : 'UNKNOWN'
}
export type DevelopmentFilters = {
  query: string
  from: string
  to: string
  product: string | string[]
  kind: string
  stage: string | string[]
  network: string | string[]
  change: string | string[]
  sort: 'latest' | 'oldest'
}
export const DEFAULT_DEVELOPMENT_FILTERS: DevelopmentFilters = {
  query: '',
  from: '',
  to: '',
  product: 'all',
  kind: 'all',
  stage: 'all',
  network: 'all',
  change: 'all',
  sort: 'latest',
}

export function selectedFilterValues(value: string | string[]): string[] {
  return Array.isArray(value) ? value : value === 'all' ? [] : [value]
}

export function updateProducts(entry: ContentEntry): { id: string; name: string }[] {
  try {
    const url = new URL(entry.sourceUrl ?? '')
    const match =
      url.hostname === 'github.com' &&
      url.pathname.match(/^\/ava-labs\/(avalanchego|coreth|subnet-evm)\/releases(?:\/|$)/i)
    if (match) {
      const id = match[1].toLowerCase() as keyof typeof PRODUCTS
      return [{ id, name: PRODUCTS[id] }]
    }
  } catch {
    /* Missing source can still have an explicit product in the title. */
  }
  const named = Object.entries(PRODUCTS).filter(
    ([, name]) =>
      new RegExp(`\\b${name}\\b`, 'i').test(entry.title) ||
      entry.sourceName?.replace(/\s+Releases$/i, '').toLowerCase() === name.toLowerCase()
  )
  return named.map(([id, name]) => ({ id, name }))
}

export function releaseStage(entry: ContentEntry): 'stable' | 'prerelease' | 'unknown' {
  if (entry.prerelease === true || (entry.prerelease == null && isReleaseCandidate(entry)))
    return 'prerelease'
  if (entry.prerelease === false) return 'stable'
  return 'unknown'
}
export function updateKindLabel(entry: ContentEntry) {
  if (entry.subKind === 'RELEASE')
    return releaseStage(entry) === 'stable'
      ? '정식 릴리스'
      : releaseStage(entry) === 'prerelease'
        ? '출시 후보·프리릴리스'
        : '릴리스'
  return entry.subKind === 'BLOG' ? '기술 아티클' : entry.subKind === 'ACP' ? 'ACP 제안' : '기타'
}
export function sourceLinkLabel(entry: ContentEntry) {
  try {
    const url = new URL(entry.sourceUrl ?? '')
    if (url.hostname === 'github.com' && /\/releases\/tag\//.test(url.pathname))
      return 'GitHub 릴리스'
    if (url.hostname === 'github.com' && /\/ACPs\//i.test(url.pathname)) return 'ACP 제안'
    if (['build.avax.network', 'builders.avax.network'].includes(url.hostname))
      return '공식 기술 블로그'
    return url.hostname
  } catch {
    return '원문 보기'
  }
}
export function deduplicateUpdates(entries: ContentEntry[]) {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    let key = entry.id
    try {
      const url = new URL(entry.sourceUrl ?? '')
      url.hash = ''
      key = url.href
    } catch {
      /* Preserve unidentified entries. */
    }
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export function selectDevelopmentUpdates(
  entries: ContentEntry[],
  filters: DevelopmentFilters,
  history = false
) {
  const matches = (value: string | string[], predicate: (option: string) => boolean) => {
    const selected = selectedFilterValues(value)
    return selected.length === 0 || selected.some(predicate)
  }
  return filterFeed(entries, {
    ...filters,
    period: 'all',
    source: 'all',
    kind: history ? 'RELEASE' : filters.kind,
  })
    .filter(
      (entry) =>
        matches(filters.product, (product) =>
          product === 'unknown'
            ? !updateProducts(entry).length
            : updateProducts(entry).some((p) => p.id === product)
        ) &&
        matches(
          filters.stage,
          (stage) => entry.subKind === 'RELEASE' && releaseStage(entry) === stage
        ) &&
        matches(
          filters.network,
          (network) =>
            updateNetwork(entry) === network ||
            (updateNetwork(entry) === 'BOTH' && ['MAINNET', 'FUJI'].includes(network))
        ) &&
        matches(
          filters.change,
          (change) => !!entry.changeFlags?.some((flag) => flag.kind === change)
        )
    )
    .sort(
      (a, b) =>
        ((Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0)) *
          (filters.sort === 'latest' ? 1 : -1) || a.id.localeCompare(b.id)
    )
}
export function closestUpdateDay(entries: ContentEntry[], day: string) {
  const days = [
    ...new Set(entries.flatMap((e) => (e.publishedAt ? [calendarDay(e.publishedAt)] : []))),
  ].sort()
  if (days.includes(day)) return day
  return days.reduce<string | null>(
    (best, next) =>
      !best ||
      Math.abs(Date.parse(next) - Date.parse(day)) < Math.abs(Date.parse(best) - Date.parse(day))
        ? next
        : best,
    null
  )
}
export function majorUpdates(entries: ContentEntry[], now = Date.now()) {
  const seen = new Set<string>()
  return entries
    .filter((entry) => {
      // A dated source announcement is historical once its activation has passed;
      // it stays in the timeline rather than remaining a permanent urgent banner.
      const recent =
        entry.publishedAt &&
        now - Date.parse(entry.publishedAt) <= 90 * 86400_000 &&
        Date.parse(entry.publishedAt) <= now
      const evidence = entry.changeFlags?.some((flag) =>
        ['protocol', 'mandatory', 'breaking', 'security'].includes(flag.kind)
      )
      const key = entry.upgradeName ?? entry.sourceUrl ?? entry.id
      if (
        !recent ||
        !evidence ||
        seen.has(key) ||
        (entry.activations?.length && entry.activations.every((a) => Date.parse(a.at) < now))
      )
        return false
      seen.add(key)
      return true
    })
    .slice(0, 3)
}
export function updateDateTime(value: string, timeZone = 'Asia/Seoul') {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}
