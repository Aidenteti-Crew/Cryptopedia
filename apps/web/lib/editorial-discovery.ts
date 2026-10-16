import type { ContentEntry, EcosystemProject, EventEntry } from './cryptopedia-types'

export type FeedFilters = { query: string; source: string; kind: string; period: string; from?: string; to?: string }
export type EventFilters = { query: string; status: string; format: string; category: string; period?: string }

const contains = (values: Array<string | null | undefined>, query: string) =>
  values.some((value) => value?.toLocaleLowerCase().includes(query))

export function filterProjects(items: EcosystemProject[], search: string, categories: string[]) {
  const query = search.trim().toLocaleLowerCase()
  return items.filter((item) =>
    (categories.length === 0 || categories.includes(item.category ?? '기타')) &&
    (!query || contains([item.name, item.description, item.developer, item.category], query))
  )
}

export function filterFeed(items: ContentEntry[], filters: FeedFilters, now = new Date()) {
  const query = filters.query.trim().toLocaleLowerCase()
  const since = filters.period === 'all' ? null : now.getTime() - Number(filters.period) * 86_400_000
  return items.filter((item) => {
    if (filters.source !== 'all' && item.sourceName !== filters.source) return false
    if (filters.kind !== 'all' && (item.subKind ?? 'OTHER') !== filters.kind) return false
    if (since !== null && (!item.publishedAt || Date.parse(item.publishedAt) < since)) return false
    if (filters.from || filters.to) {
      if (!item.publishedAt) return false
      const day = calendarDay(item.publishedAt)
      if (filters.from && day < filters.from || filters.to && day > filters.to) return false
    }
    return !query || contains([item.title, item.summary, item.sourceName, item.version, item.upgradeName], query)
  })
}

export function filterEvents(items: EventEntry[], filters: EventFilters, now = new Date()) {
  const query = filters.query.trim().toLocaleLowerCase()
  const today = calendarDay(now.toISOString())
  const periodStart = filters.period === 'next30' ? today : filters.period === 'past30' ? calendarDay(new Date(now.getTime() - 30 * 86_400_000).toISOString()) : null
  const periodEnd = filters.period === 'next30' ? calendarDay(new Date(now.getTime() + 30 * 86_400_000).toISOString()) : filters.period === 'past30' ? today : null
  return items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false
    if (filters.format === 'online' && !item.isOnline) return false
    if (filters.format === 'offline' && item.isOnline) return false
    if (filters.category !== 'all' && item.category !== filters.category) return false
    const startDay = calendarDay(item.startsAt)
    const endDay = calendarDay(item.endsAt ?? item.startsAt)
    if (filters.period === 'this-month' && (startDay.slice(0, 7) > today.slice(0, 7) || endDay.slice(0, 7) < today.slice(0, 7))) return false
    if (periodStart && periodEnd && (startDay > periodEnd || endDay < periodStart)) return false
    return !query || contains([item.title, item.summary, item.organizer, item.venueName, item.venueAddress, item.city, item.country], query)
  })
}

export function calendarDay(value: string, timeZone = 'Asia/Seoul') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function suggestedEventDay(items: EventEntry[]) {
  const upcoming = items.filter((item) => item.status === 'UPCOMING' || item.status === 'ONGOING')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const latest = [...items].sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
  return upcoming || latest ? calendarDay((upcoming ?? latest).startsAt) : null
}

export function suggestedFeedDay(items: ContentEntry[]) {
  const latest = items.filter((item) => item.publishedAt).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))[0]
  return latest?.publishedAt ? calendarDay(latest.publishedAt) : null
}

export function eventsFromDay(items: EventEntry[], day: string, month: string, direction: 'future' | 'past') {
  return items.filter((item) => {
    const start = calendarDay(item.startsAt)
    const end = calendarDay(item.endsAt ?? item.startsAt)
    return start.slice(0,7) <= month && end.slice(0,7) >= month && (direction === 'future' ? end >= day : start <= day)
  }).sort((a,b) => direction === 'future' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt))
}
