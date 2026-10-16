'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import type { EventEntry } from '@/lib/cryptopedia-types'
import { groupTimelineEvents } from '@/lib/event-timeline'
import { useReadingScroll } from './use-reading-scroll'

export function SyncedEventTimeline({
  events,
  target,
  selectedDay,
  today,
  onVisibleDay,
  renderEvent,
  onNavigateDay,
  order,
}: {
  order?: 'asc' | 'desc'
  events: EventEntry[]
  target: { day: string; request: number; explicit?: boolean }
  selectedDay: string
  today: string
  onVisibleDay: (day: string) => void
  renderEvent: (event: EventEntry) => ReactNode
  onNavigateDay?: (day: string) => void
}) {
  return (
    <SyncedDateList
      order={order}
      items={events}
      target={target}
      selectedDay={selectedDay}
      today={today}
      onVisibleDay={onVisibleDay}
      onNavigateDay={onNavigateDay}
      renderItem={renderEvent}
      emptyMessage="이 날짜에는 등록된 행사가 없습니다."
    />
  )
}

export function SyncedDateList<T extends { id: string; startsAt: string; endsAt: string | null }>({
  items,
  target,
  selectedDay,
  today,
  onVisibleDay,
  onNavigateDay,
  renderItem,
  appearance = 'timeline',
  label = '행사 타임라인',
  order = 'asc',
  emptyMessage = '이 날짜에는 등록된 항목이 없습니다.',
  omitEmptyDates = false,
}: {
  items: T[]
  target: { day: string; request: number; explicit?: boolean }
  selectedDay: string
  today: string
  onVisibleDay: (day: string) => void
  renderItem: (item: T) => ReactNode
  onNavigateDay?: (day: string) => void
  appearance?: 'timeline' | 'cards'
  label?: string
  order?: 'asc' | 'desc'
  emptyMessage?: string
  omitEmptyDates?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  useReadingScroll(root)
  const sections = useRef(new Map<string, HTMLElement>())
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const groups = useMemo(() => {
    const grouped = groupTimelineEvents(items, target.day)
    if (order === 'desc') {
      grouped.reverse()
      for (const [, entries] of grouped) entries.reverse()
    }
    return grouped.filter(
      ([, entries]) => entries.length > 0 || (target.explicit && !omitEmptyDates)
    )
  }, [items, target.day, target.explicit, order, omitEmptyDates])
  const nearest = useMemo(
    () =>
      groups
        .filter(([, entries]) => entries.length)
        .reduce<
          string | null
        >((best, [day]) => (!best || Math.abs(Date.parse(day) - Date.parse(target.day)) < Math.abs(Date.parse(best) - Date.parse(target.day)) ? day : best), null),
    [groups, target.day]
  )

  // Only calendar actions change target. Scroll feedback changes selectedDay, so it
  // cannot trigger a second programmatic scroll and bounce between the two views.
  useLayoutEffect(() => {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
    const container = root.current
    const section =
      sections.current.get(target.day) ?? (nearest ? sections.current.get(nearest) : null)
    if (container && section)
      container.scrollTo({
        top:
          container.scrollTop +
          section.getBoundingClientRect().top -
          container.getBoundingClientRect().top -
          12,
        behavior: 'instant',
      })
  }, [target, groups, nearest])
  useEffect(
    () => () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current)
    },
    []
  )

  const syncVisibleDay = () => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current)
    // Keep the calendar still while scrolling through intermediate dates/months.
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      const container = root.current
      if (!container) return
      const line = container.getBoundingClientRect().top + 36
      let visible = groups[0]?.[0]
      for (const [date] of groups) {
        const section = sections.current.get(date)
        if (section && section.getBoundingClientRect().top <= line) visible = date
        else break
      }
      if (visible && visible !== selectedDay) onVisibleDay(visible)
    }, 180)
  }

  return (
    <div
      ref={root}
      onScroll={syncVisibleDay}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="h-[var(--editorial-list-height,70vh)] min-h-[320px] max-h-[calc(100dvh-48px)] overflow-y-auto overscroll-contain rounded-2xl px-3 py-3 outline-none focus-visible:ring-1 focus-visible:ring-[var(--editorial-accent)] [overflow-anchor:none]"
    >
      {groups.map(([date, items]) => (
        <section
          key={date}
          ref={(element) => {
            if (element) sections.current.set(date, element)
            else sections.current.delete(date)
          }}
          data-timeline-day={date}
          aria-current={date === selectedDay ? 'date' : undefined}
          className={
            appearance === 'timeline'
              ? `relative border-l pb-7 pl-5 ${date === selectedDay ? 'border-[var(--editorial-accent)]' : 'border-white/15'}`
              : 'pb-6'
          }
        >
          {appearance === 'timeline' && (
            <span
              className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${date === selectedDay ? 'bg-[var(--editorial-accent)]' : 'bg-[#67717e]'}`}
            />
          )}
          <h2
            className={`mb-4 text-sm font-semibold ${date === selectedDay ? 'text-[var(--editorial-accent)]' : ''}`}
          >
            {date === today ? '오늘 · ' : ''}
            {date.replaceAll('-', '.')}{' '}
            <span className="ml-2 font-normal text-[var(--editorial-muted)]">
              {new Intl.DateTimeFormat('ko-KR', { weekday: 'long', timeZone: 'Asia/Seoul' }).format(
                new Date(`${date}T12:00:00+09:00`)
              )}
            </span>
          </h2>
          {items.length ? (
            items.map((item) => <div key={item.id}>{renderItem(item)}</div>)
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-5">
              <p role="status" className="text-sm leading-6 text-[var(--editorial-muted)]">
                {emptyMessage || '이 날짜에는 등록된 항목이 없습니다.'}
              </p>
              {nearest && onNavigateDay && (
                <button
                  type="button"
                  onClick={() => onNavigateDay(nearest)}
                  className="mt-2 min-h-10 text-xs text-[var(--editorial-accent)] underline underline-offset-4"
                >
                  가까운 날짜 보기 · {nearest.replaceAll('-', '.')}
                </button>
              )}
            </div>
          )}
        </section>
      ))}
      {groups.length === 0 && (
        <p role="status" className="py-5 text-sm text-[var(--editorial-muted)]">
          표시할 항목이 없습니다.
        </p>
      )}
      <div aria-hidden="true" className="h-[calc(70vh-100px)] max-h-[620px]" />
    </div>
  )
}
