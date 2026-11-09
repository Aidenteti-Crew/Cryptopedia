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
