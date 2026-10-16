'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, MapPin, Clock3, Users } from 'lucide-react'
import type { EventEntry, EventStatus } from '@/lib/cryptopedia-types'
import { calendarDay, filterEvents } from '@/lib/editorial-discovery'
import { SyncedEventTimeline } from './synced-event-timeline'
import { EditorialCalendar, EDITORIAL_CALENDAR_LAYOUT } from './editorial-calendar'
import { CalendarVisibilityToggle } from './editorial-view-toggle'
import {
  DiscoveryHeader,
  DiscoveryToolbar,
  DiscoverySearch,
  DiscoveryFilter,
} from './discovery-controls'
import { DiscoveryFilterPanel, DiscoveryCheckboxGroup, DiscoveryResults } from './discovery-filters'
import { useDiscoveryState, DiscoveryScrollRestore, useDiscoveryView } from './discovery-state'

const STATUS: Record<EventStatus, string> = {
  UPCOMING: '예정',
  ONGOING: '진행 중',
  PAST: '종료',
  CANCELLED: '취소',
  POSTPONED: '연기',
}
const CATEGORY: Record<string, string> = {
  COMMUNITY: '커뮤니티 행사',
  CONFERENCE: '컨퍼런스',
  HACKATHON: '해커톤',
  TRADING_CONTEST: '트레이딩 대회',
  OTHER: '기타',
}

function EventRow({ event }: { event: EventEntry }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hostSummary = /^Hosted by ([^\n.!?]{1,200})$/i.exec(event.summary.trim())?.[1]
  const organizer = hostSummary ?? event.organizer
  const date = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    ...(event.allDay ? {} : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }),
  })
  const location = event.isOnline
    ? '온라인'
    : [event.venueName, event.city].filter(Boolean).join(' · ') || '장소 정보 없음'
  const register = !!event.registrationUrl && ['UPCOMING', 'ONGOING'].includes(event.status)
  const primary = register ? event.registrationUrl : (event.sourceUrl ?? event.registrationUrl)
  const statusColor =
    event.status === 'CANCELLED'
      ? 'rose'
      : event.status === 'ONGOING'
        ? 'mint'
        : event.status === 'PAST'
          ? 'neutral'
          : 'orange'
  return (
    <article data-tone="events" className="editorial-content-card mb-3 last:mb-0">
      <div className="editorial-card-meta flex flex-wrap items-center gap-x-3 gap-y-2">
        <time
          dateTime={event.startsAt}
          className="inline-flex flex-wrap items-center gap-1.5 tabular-nums"
        >
          <Clock3 size={12} />
          {date.format(new Date(event.startsAt))}
          {event.endsAt && ` — ${date.format(new Date(event.endsAt))}`}
          {event.allDay ? ' · 종일' : ' KST'}
        </time>
        <span data-color={statusColor} className="editorial-color-badge">
          {STATUS[event.status]}
        </span>
      </div>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3
            className={`break-keep text-[17px] font-semibold leading-7 [overflow-wrap:anywhere] ${event.status === 'CANCELLED' ? 'text-[var(--editorial-muted)] line-through' : ''}`}
          >
            {event.title}
          </h3>
        </div>
        {event.imageUrl && !imageFailed && (
          <img
            src={event.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover sm:h-20 sm:w-20"
          />
        )}
      </div>
      {organizer && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--editorial-muted)]">
          <Users size={13} className="mt-0.5 shrink-0" />
          {organizer} 주최
        </p>
      )}
      <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-[var(--editorial-muted)]">
        <MapPin size={13} className="mt-0.5 shrink-0" />
        {location}
      </p>
      {event.summary && !hostSummary && (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-[var(--editorial-muted)] [overflow-wrap:anywhere]">
          {event.summary}
        </p>
      )}
      {event.timezone !== 'Asia/Seoul' && !event.allDay && (
        <p className="mt-2 text-[11px] text-[var(--editorial-muted)]">
          원문 시간대 · {event.timezone}
        </p>
      )}
      {primary && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <a
            href={primary}
            target="_blank"
            rel="noopener noreferrer"
            className={
              register
                ? 'inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--editorial-accent)] px-3 text-xs font-medium text-[#15191e]'
                : 'inline-flex min-h-9 items-center gap-1 text-xs text-[var(--editorial-accent)]'
            }
          >
            {register ? '참가 신청' : '자세히 보기'}
            <ExternalLink size={12} />
          </a>
          {register && event.sourceUrl && event.sourceUrl !== primary && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1 text-xs text-[var(--editorial-muted)]"
            >
              자세히 보기
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </article>
  )
}

export function EventsPage({
  events,
  archiveMode = false,
  stateKey = 'events',
}: {
  events: EventEntry[]
  archiveMode?: boolean
  onOpenArchive?: () => void
  stateKey?: string
}) {
  const key = archiveMode ? `${stateKey}:archive` : stateKey
  const today = calendarDay(new Date().toISOString())
  const [query, setQuery] = useDiscoveryState(`${key}:query`, '')
  const [formats, setFormats] = useDiscoveryState<string[]>(`${key}:formats`, [])
  const [categories, setCategories] = useDiscoveryState<string[]>(`${key}:categories`, [])
  const [sort, setSort] = useDiscoveryState<'asc' | 'desc'>(`${key}:sort`, 'asc')
  const [day, setDay] = useDiscoveryState(`${key}:day`, today)
  const [month, setMonth] = useState(day.slice(0, 7))
  const [following, setFollowing] = useState(false)
  const [target, setTarget] = useState({ day, request: 0, explicit: false })
  const [view, setView] = useDiscoveryView(
    `${key}:view`,
    archiveMode ? 'editorial-view:event-archive' : 'editorial-view:events',
    archiveMode ? 'list' : 'calendar',
    ['list', 'calendar'] as const
  )
  const kinds = [...new Set(events.map((e) => e.category).filter((v): v is string => !!v))]
  const methods = new Set(events.map((e) => e.isOnline))
  const matching = useMemo(
    () =>
      filterEvents(events, { query, status: 'all', format: 'all', category: 'all' }).filter(
        (e) =>
          (!formats.length || formats.includes(e.isOnline ? 'online' : 'offline')) &&
          (!categories.length || categories.includes(e.category ?? ''))
      ),
    [events, query, formats, categories]
  )
  const detailCount = formats.length + categories.length
  const resetDetail = () => {
    setFormats([])
    setCategories([])
  }
  const reset = () => {
    setQuery('')
    resetDetail()
    setSort('asc')
  }
  const selectDay = (value: string) => {
    setFollowing(false)
    setDay(value)
    setMonth(value.slice(0, 7))
    setTarget((current) => ({ day: value, request: current.request + 1, explicit: true }))
  }
  return (
    <article className="px-4 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]">
      <DiscoveryHeader
        theme="events"
        count={events.length}
        title={archiveMode ? '지난 이벤트' : '행사 및 이벤트'}
        description={
          archiveMode
            ? '종료된 행사와 커뮤니티의 기록을 모았습니다.'
            : '달력에서 날짜를 고르고, 다가오는 만남을 살펴보세요.'
        }
      />
      <DiscoveryToolbar>
        <DiscoverySearch value={query} onChange={setQuery} placeholder="행사명·주최자·장소 검색" />
      </DiscoveryToolbar>
      <div className="mt-4 flex min-h-14 items-center justify-between border-b border-white/10">
        <span className="text-sm text-[var(--editorial-muted)]">커뮤니티의 만남과 개발 일정</span>
        {(methods.size > 1 || kinds.length > 1) && (
          <DiscoveryFilterPanel
            count={detailCount}
            resultCount={matching.length}
            onReset={resetDetail}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              {methods.size > 1 && (
                <DiscoveryCheckboxGroup
                  label="참여 방식"
                  value={formats}
                  onChange={setFormats}
                  options={[
                    { value: 'online', label: '온라인' },
                    { value: 'offline', label: '오프라인' },
                  ]}
                />
              )}
              {kinds.length > 1 && (
                <DiscoveryCheckboxGroup
                  label="행사 종류"
                  value={categories}
                  onChange={setCategories}
                  options={kinds.map((value) => ({ value, label: CATEGORY[value] ?? value }))}
                />
              )}
            </div>
          </DiscoveryFilterPanel>
        )}
      </div>
      <DiscoveryResults
        count={matching.length}
        description="행사일 · 한국시간 기준"
        active={!!query || detailCount > 0 || sort !== 'asc'}
        onReset={reset}
      >
        <DiscoveryFilter
          label="정렬"
          value={sort}
          onChange={(value) => setSort(value as 'asc' | 'desc')}
          options={[
            { value: 'asc', label: '날짜 빠른순' },
            { value: 'desc', label: '날짜 늦은순' },
          ]}
        />
        <CalendarVisibilityToggle
          visible={view === 'calendar'}
          onToggle={() => {
            setTarget((current) => ({ ...current, day, request: current.request + 1 }))
            setView(view === 'calendar' ? 'list' : 'calendar')
          }}
        />
      </DiscoveryResults>
      <div className={view === 'calendar' ? EDITORIAL_CALENDAR_LAYOUT : ''}>
        <div className={view === 'calendar' ? 'xl:sticky xl:top-6' : 'hidden'}>
          <EditorialCalendar
            items={matching.map((e) => ({
              id: e.id,
              title: e.title,
              day: calendarDay(e.startsAt),
              endDay: e.endsAt ? calendarDay(e.endsAt) : undefined,
            }))}
            month={month}
            selectedDay={day}
            selectionStyle={following ? 'outline' : 'filled'}
            onMonthChange={(value) =>
              selectDay(value === today.slice(0, 7) ? today : `${value}-01`)
            }
            onSelectDay={selectDay}
          />
        </div>
        <div className="min-w-0">
          {matching.length ? (
            <SyncedEventTimeline
              events={matching}
              target={target}
              selectedDay={day}
              today={today}
              order={sort}
              onVisibleDay={(value) => {
                setFollowing(true)
                setDay(value)
                setMonth(value.slice(0, 7))
              }}
              onNavigateDay={selectDay}
              renderEvent={(event) => <EventRow event={event} />}
            />
          ) : (
            <p className="py-4 text-sm text-[var(--editorial-muted)]">
              {archiveMode ? '지난 행사가 없습니다.' : '검색 조건에 맞는 행사가 없습니다.'}
            </p>
          )}
        </div>
      </div>
      <DiscoveryScrollRestore stateKey={key} />
    </article>
  )
}
