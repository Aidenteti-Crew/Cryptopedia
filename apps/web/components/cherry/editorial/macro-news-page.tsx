'use client'

import { useMemo, useRef, useState } from 'react'
import { LayoutGrid, Handshake, BarChart3, MoreHorizontal, ExternalLink } from 'lucide-react'
import type { ContentEntry } from '@/lib/cryptopedia-types'
import { calendarDay, filterFeed } from '@/lib/editorial-discovery'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { EditorialCalendar, EDITORIAL_CALENDAR_LAYOUT } from './editorial-calendar'
import { SyncedDateList } from './synced-event-timeline'
import { CalendarVisibilityToggle } from './editorial-view-toggle'
import {
  DiscoveryHeader,
  DiscoverySearch,
  DiscoveryToolbar,
  DiscoveryFilter,
} from './discovery-controls'
import {
  DiscoveryFilterPanel,
  DiscoveryCheckboxGroup,
  DiscoveryResults,
  DiscoveryTypeBar,
} from './discovery-filters'
import { DiscoveryDateRange } from './discovery-date-range'
import { EditorialEmpty } from './editorial-states'
import { useDiscoveryState, DiscoveryScrollRestore, useDiscoveryView } from './discovery-state'

const TYPES = [
  { value: 'all', label: '전체', Icon: LayoutGrid },
  {
    value: 'COLLAB',
    label: '협업·도입',
    Icon: Handshake,
    color: 'text-[#a9bde9]',
    background: 'bg-[#a9bde9]/10',
  },
  {
    value: 'VOLUME',
    label: '거래·시장 지표',
    Icon: BarChart3,
    color: 'text-[#8bcab4]',
    background: 'bg-[#8bcab4]/10',
  },
  { value: 'OTHER', label: '기타', Icon: MoreHorizontal },
]
const clock = (date: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(date))

function MacroRow({ entry, onOpen }: { entry: ContentEntry; onOpen: (id: string) => void }) {
  const kind = TYPES.find((type) => type.value === entry.subKind)?.label
  return (
    <article data-tone="macro" className="editorial-content-card mb-3 last:mb-0">
      <div className="editorial-card-meta flex flex-wrap items-center gap-x-3 gap-y-2">
        {entry.publishedAt && (
          <time dateTime={entry.publishedAt} className="tabular-nums">
            {calendarDay(entry.publishedAt).replaceAll('-', '.')} · {clock(entry.publishedAt)}
          </time>
        )}
        {entry.sourceName && <span>{entry.sourceName}</span>}
        {kind && (
          <span
            data-color={
              entry.subKind === 'VOLUME' ? 'mint' : entry.subKind === 'COLLAB' ? 'blue' : 'violet'
            }
            className="editorial-color-badge"
          >
            {kind}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(entry.id)}
        className="text-left text-[17px] font-semibold leading-7 tracking-[-.02em] hover:text-[var(--editorial-accent)]"
      >
        {entry.title}
      </button>
      {entry.summary && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--editorial-muted)]">
          {entry.summary}
        </p>
      )}
      {entry.sourceUrl && entry.kind === 'MACRO' && (
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs text-[var(--editorial-accent)]"
        >
          원문 보기
          <ExternalLink size={12} />
        </a>
      )}
    </article>
  )
}

export function MacroNewsPage({
  entries,
  title,
  introduction,
  stateKey = 'macro',
  onOpenEntry,
}: {
  entries: ContentEntry[]
  title: string
  introduction: string
  stateKey?: string
  onOpenEntry?: (id: string) => void
}) {
  const [query, setQuery] = useDiscoveryState(`${stateKey}:query`, '')
  const [kind, setKind] = useDiscoveryState(`${stateKey}:kind`, 'all')
  const [sources, setSources] = useDiscoveryState<string[]>(`${stateKey}:sources`, [])
  const [range, setRange] = useDiscoveryState(`${stateKey}:range`, { from: '', to: '' })
  const [sort, setSort] = useDiscoveryState<'latest' | 'oldest'>(`${stateKey}:sort`, 'latest')
  const [view, setView] = useDiscoveryView(`${stateKey}:view`, 'editorial-view:macro', 'list', [
    'list',
    'calendar',
  ] as const)
  const today = calendarDay(new Date().toISOString())
  const [selectedDay, setSelectedDay] = useDiscoveryState(`${stateKey}:day`, today)
  const [month, setMonth] = useState(selectedDay.slice(0, 7))
  const [target, setTarget] = useState({ day: selectedDay, request: 0, explicit: false })
  const [following, setFollowing] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const all = useMemo(() => {
    const seen = new Set<string>()
    return entries.filter((entry) => {
      const key = entry.sourceUrl?.split('#')[0] ?? entry.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [entries])
  const sourceNames = useMemo(
    () => [...new Set(all.map((entry) => entry.sourceName).filter((v): v is string => !!v))].sort(),
    [all]
  )
  const shown = useMemo(
    () =>
      filterFeed(all, { query, source: 'all', kind, period: 'all', ...range })
        .filter((entry) => !sources.length || sources.includes(entry.sourceName ?? ''))
        .sort(
          (a, b) =>
            ((Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0)) *
              (sort === 'latest' ? 1 : -1) || a.id.localeCompare(b.id)
        ),
    [all, query, sources, kind, range, sort]
  )
  const dated = useMemo(
    () =>
      shown.flatMap((entry) =>
        entry.publishedAt ? [{ ...entry, startsAt: entry.publishedAt, endsAt: null }] : []
      ),
    [shown]
  )
  const groups = useMemo(() => {
    const map = new Map<string, ContentEntry[]>()
    for (const e of shown) {
      const day = e.publishedAt ? calendarDay(e.publishedAt) : 'unknown'
      const group = map.get(day) ?? []
      group.push(e)
      map.set(day, group)
    }
    return [...map]
  }, [shown])
  const selectDay = (day: string) => {
    setFollowing(false)
    setSelectedDay(day)
    setMonth(day.slice(0, 7))
    setTarget((value) => ({ day, request: value.request + 1, explicit: true }))
  }
  const resetDetail = () => {
    setSources([])
    setRange({ from: '', to: '' })
  }
  const reset = () => {
    resetDetail()
    setQuery('')
    setKind('all')
    setSort('latest')
  }
  const count = sources.length + Number(!!range.from || !!range.to)
  const open = (id: string) => {
    if (onOpenEntry) {
      onOpenEntry(id)
      return
    }
    returnFocus.current = document.activeElement as HTMLElement
    setDetailId(id)
  }
  const detail = all.find((entry) => entry.id === detailId)
  const row = (entry: ContentEntry) => <MacroRow entry={entry} onOpen={open} />
  return (
    <article className="px-4 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]">
      <DiscoveryHeader title={title} description={introduction} theme="macro" count={all.length} />
      <DiscoveryToolbar>
        <DiscoverySearch value={query} onChange={setQuery} placeholder="제목·내용·출처 검색" />
      </DiscoveryToolbar>
      <DiscoveryTypeBar
        label="매크로 소식 유형"
        value={kind}
        onChange={setKind}
        options={TYPES.filter(
          (type) =>
            type.value === 'all' || all.some((entry) => (entry.subKind ?? 'OTHER') === type.value)
        )}
      >
        <DiscoveryFilterPanel
          count={count}
          resultCount={shown.length}
          onReset={resetDetail}
          description={
            sourceNames.length > 1 ? undefined : '공개일 범위로 관심 있는 시기의 소식을 찾아보세요.'
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {sourceNames.length > 1 && (
              <DiscoveryCheckboxGroup
                label="출처"
                value={sources}
                onChange={setSources}
                options={sourceNames.map((value) => ({ value, label: value }))}
              />
            )}
            <div className="space-y-3">
              <p className="text-xs font-semibold">공개일</p>
              <DiscoveryDateRange
                from={range.from}
                to={range.to}
                onChange={(from, to) => setRange({ from, to })}
              />
            </div>
          </div>
        </DiscoveryFilterPanel>
      </DiscoveryTypeBar>
      <DiscoveryResults
        count={shown.length}
        description="공개일 · 한국시간 기준"
        active={!!query || kind !== 'all' || count > 0 || sort !== 'latest'}
        onReset={reset}
      >
        <DiscoveryFilter
          label="정렬"
          value={sort}
          onChange={(v) => setSort(v as 'latest' | 'oldest')}
          options={[
            { value: 'latest', label: '최신순' },
            { value: 'oldest', label: '오래된순' },
          ]}
        />
        <CalendarVisibilityToggle
          visible={view === 'calendar'}
          onToggle={() => {
            setTarget((value) => ({ ...value, day: selectedDay, request: value.request + 1 }))
            setView(view === 'calendar' ? 'list' : 'calendar')
          }}
        />
      </DiscoveryResults>
      {!shown.length ? (
        <EditorialEmpty
          message={all.length ? '검색 조건에 맞는 소식이 없습니다.' : '등록된 소식이 없습니다.'}
        />
      ) : view === 'calendar' ? (
        <div className={EDITORIAL_CALENDAR_LAYOUT}>
          <div className="xl:sticky xl:top-6">
            <EditorialCalendar
              tone="macro"
              month={month}
              selectedDay={selectedDay}
              selectionStyle={following ? 'outline' : 'filled'}
              items={dated.map((e) => ({ id: e.id, title: e.title, day: calendarDay(e.startsAt) }))}
              onMonthChange={(value) =>
                selectDay(value === today.slice(0, 7) ? today : `${value}-01`)
              }
              onSelectDay={selectDay}
            />
          </div>
          <div className="min-w-0">
            <SyncedDateList
              items={dated}
              target={target}
              selectedDay={selectedDay}
              today={today}
              onVisibleDay={(day) => {
                setFollowing(true)
                setSelectedDay(day)
                setMonth(day.slice(0, 7))
              }}
              onNavigateDay={selectDay}
              renderItem={row}
              appearance="cards"
              order={sort === 'latest' ? 'desc' : 'asc'}
              label="매크로 소식 날짜별 목록"
              emptyMessage="이 날짜에는 게시된 소식이 없습니다."
            />
            {shown
              .filter((e) => !e.publishedAt)
              .map((e) => (
                <div key={e.id}>{row(e)}</div>
              ))}
          </div>
        </div>
      ) : (
        <div>
          {groups.map(([day, items]) => (
            <section key={day} className="mb-8">
              <h2 className="mb-4 border-b border-white/10 pb-3 text-sm font-semibold tabular-nums text-[var(--editorial-accent)]">
                {day === 'unknown' ? '공개일 미제공' : day.replaceAll('-', '.')}
              </h2>
              {items.map((entry) => (
                <div key={entry.id}>{row(entry)}</div>
              ))}
            </section>
          ))}
        </div>
      )}
      <Sheet
        open={!!detail}
        onOpenChange={(value) => {
          if (!value) setDetailId(null)
        }}
      >
        <SheetContent
          closeLabel="상세 닫기"
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            returnFocus.current?.focus()
          }}
          className="editorial-root !min-h-0 !w-full overflow-y-auto border-white/10 !bg-[var(--discovery-surface)] px-6 pt-16 sm:!max-w-[620px] sm:px-9"
        >
          {detail && (
            <>
              <SheetTitle className="break-keep text-2xl leading-9 !text-[var(--editorial-ink)]">
                {detail.title}
              </SheetTitle>
              <SheetDescription className="!text-[var(--editorial-muted)]">
                {detail.publishedAt &&
                  `${calendarDay(detail.publishedAt).replaceAll('-', '.')} ${clock(detail.publishedAt)} KST · `}
                {detail.sourceName}
              </SheetDescription>
              <p className="my-5 whitespace-pre-line text-[15px] leading-8 text-[var(--editorial-muted)]">
                {detail.summary}
              </p>
              {detail.sourceUrl && (
                <a
                  href={detail.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[var(--editorial-accent)]"
                >
                  원문 보기
                  <ExternalLink size={14} />
                </a>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
      <DiscoveryScrollRestore stateKey={stateKey} />
    </article>
  )
}
