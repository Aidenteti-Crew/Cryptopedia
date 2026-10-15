import type { LandingTreemapItem } from './api'
import type { ContentEntry, EcosystemProjectsResponse } from './cryptopedia-types'

export interface ProjectHeatmapItem {
  name: string
  count: number
  percent: number
  category: string | null
}

export function getProjectHeatmapItems(
  data: Pick<EcosystemProjectsResponse, 'categories' | 'total'>,
  visibleCategories = 20
): ProjectHeatmapItem[] {
  const categories = data.categories
    .filter((category) => category.count > 0)
    .toSorted((left, right) => right.count - left.count || left.name.localeCompare(right.name))
  const missingCount = Math.max(0, data.total - categories.reduce((sum, category) => sum + category.count, 0))
  if (missingCount) categories.push({ name: '미분류', count: missingCount })
  const total = categories.reduce((sum, category) => sum + category.count, 0)
  if (!total) return []
  const visible = categories.slice(0, visibleCategories)
  const remaining = categories.slice(visibleCategories)
  const items: Array<{ name: string; count: number; category: string | null }> = visible.map(
    (category) => ({ ...category, category: category.name === '미분류' ? null : category.name })
  )
  if (remaining.length) {
    items.push({
      name: `그 외 ${remaining.length}개 분야`,
      count: remaining.reduce((sum, category) => sum + category.count, 0),
      category: null,
    })
  }
  return items.map((item) => ({ ...item, percent: Math.round((item.count / total) * 1000) / 10 }))
}

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
