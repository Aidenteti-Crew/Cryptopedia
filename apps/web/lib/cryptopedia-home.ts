import type { LandingTreemapItem } from './api'
import type { ContentEntry } from './cryptopedia-types'

export const NEWS_LABELS: Record<string, string> = {
  projects: '체인·프로젝트',
  macro: '매크로 소식',
  events: '행사·이벤트',
  updates: '개발 업데이트',
}

export function sortHomeNews(entries: ContentEntry[]): ContentEntry[] {
  return [...entries].sort((left, right) => {
    if (left.publishedAt || right.publishedAt) {
      const difference =
        (right.publishedAt ? Date.parse(right.publishedAt) : 0) -
        (left.publishedAt ? Date.parse(left.publishedAt) : 0)
      if (difference) return difference
    }
    return (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id)
  })
}

export function getNewsDistribution(entries: ContentEntry[]): LandingTreemapItem[] {
  const category: Record<string, string> = {
    PROJECT: 'projects',
    MACRO: 'macro',
    EVENT: 'events',
    DEV: 'updates',
    UPDATE: 'updates',
  }
  const seen = new Set<string>()
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const page = category[entry.kind]
    if (!page || seen.has(entry.id)) continue
    seen.add(entry.id)
    counts.set(page, (counts.get(page) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  return [...counts.entries()].map(([page, articleCount]) => ({
    page,
    articleCount,
    percent: Math.round((articleCount / total) * 1000) / 10,
  }))
}
