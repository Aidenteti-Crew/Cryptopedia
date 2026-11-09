import type { EventEntry } from './cryptopedia-types'
import { calendarDay } from './editorial-discovery'

export interface PlatformEventGroups {
  // Started before today and not over yet: shown once, above the dated list.
  ongoing: EventEntry[]
  days: [day: string, events: EventEntry[]][]
}

const LISTED: ReadonlySet<EventEntry['status']> = new Set(['UPCOMING', 'ONGOING', 'POSTPONED'])

export function groupPlatformEvents(events: EventEntry[], now: Date): PlatformEventGroups {
  const today = calendarDay(now.toISOString())
  const ongoing: EventEntry[] = []
  const days = new Map<string, EventEntry[]>()
  for (const event of events) {
    if (!LISTED.has(event.status)) continue
    const day = calendarDay(event.startsAt)
    if (day < today) {
      if (calendarDay(event.endsAt ?? event.startsAt) >= today) ongoing.push(event)
      continue
    }
    days.set(day, [...(days.get(day) ?? []), event])
  }
  const byStart = (a: EventEntry, b: EventEntry) => a.startsAt.localeCompare(b.startsAt)
  return {
    ongoing: ongoing.sort(byStart),
    days: [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => [day, items.sort(byStart)]),
  }
}

// "오늘" · "내일" · "11월 11일", with the weekday beside it ("수요일").
export function dayHeading(day: string, now: Date): { date: string; weekday: string } {
  const today = calendarDay(now.toISOString())
  const tomorrow = calendarDay(new Date(now.getTime() + 86_400_000).toISOString())
  const noon = new Date(`${day}T12:00:00+09:00`)
  const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'long' }).format(noon)
  if (day === today) return { date: '오늘', weekday }
  if (day === tomorrow) return { date: '내일', weekday }
  const [, month, date] = day.split('-').map(Number)
  return { date: `${month}월 ${date}일`, weekday }
}

// Luma calendars put the host in the summary ("Hosted by Team1 Korea") instead of organizer.
export function eventHost(event: Pick<EventEntry, 'summary' | 'organizer'>): {
  host: string | null
  summaryIsHost: boolean
} {
  const fromSummary = /^Hosted by ([^\n.!?]{1,200})$/i.exec(event.summary.trim())?.[1]
  return { host: fromSummary ?? event.organizer, summaryIsHost: !!fromSummary }
}

export function eventLocation(
  event: Pick<EventEntry, 'isOnline' | 'venueName' | 'city'>
): string {
  if (event.isOnline) return '온라인'
  return [event.venueName, event.city].filter(Boolean).join(' · ') || '장소 정보 없음'
}

const SCOPE_LABEL: Record<string, string> = {
  avalanche: 'Avalanche',
  'web3-kr': '국내 Web3',
}

// Snapshots made before the scope field existed fall back to the chain.
export function scopeLabel(event: Pick<EventEntry, 'scope' | 'chain'>): string | null {
  const key = (event.scope ?? event.chain ?? '').toLowerCase()
  return SCOPE_LABEL[key] ?? null
}

// The order the list shows: ongoing first, then each day. Previous / next in the detail follow it.
export function listedEventIds(groups: PlatformEventGroups): string[] {
  return [...groups.ongoing, ...groups.days.flatMap(([, events]) => events)].map((e) => e.id)
}

export function neighbors(ids: string[], id: string): { previous: string | null; next: string | null } {
  const at = ids.indexOf(id)
  if (at === -1) return { previous: null, next: null }
  return { previous: ids[at - 1] ?? null, next: ids[at + 1] ?? null }
}

export function eventHref(id: string): string {
  return `/events?event=${encodeURIComponent(id)}`
}

const dayFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})
const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: 'numeric',
  minute: '2-digit',
})

// "11월 11일 수요일" + "오후 6:00 - 오후 10:00" in Seoul time; an all-day event says 종일.
export function eventWhen(event: Pick<EventEntry, 'startsAt' | 'endsAt' | 'allDay'>): {
  day: string
  time: string
} {
  const start = new Date(event.startsAt)
  const end = event.endsAt ? new Date(event.endsAt) : null
  const sameDay = !end || calendarDay(end.toISOString()) === calendarDay(start.toISOString())
  const day = sameDay ? dayFormat.format(start) : `${dayFormat.format(start)} - ${dayFormat.format(end!)}`
  if (event.allDay) return { day, time: '종일' }
  return { day, time: end ? `${timeFormat.format(start)} - ${timeFormat.format(end)}` : timeFormat.format(start) }
}
