'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import type { EventEntry } from '@/lib/cryptopedia-types'
import { cryptopediaRepository } from '@/lib/cryptopedia-repository'
import { calendarDay } from '@/lib/editorial-discovery'
import { useEventBookmarks } from '@/lib/event-bookmarks'
import {
  chainOptions,
  eventHref,
  eventsOnDay,
  filterPlatformEvents,
  groupPlatformEvents,
  listedEventIds,
  listedEvents,
  neighbors,
} from '@/lib/platform-events'

import type { EditorialViewMode } from './editorial-view-toggle'
import { EventDetailPanel } from './platform-event-detail'
import { ARCHIVE_HREF, PlatformEventList } from './platform-event-list'
import { PlatformEventsCalendarView } from './platform-events-calendar-view'
import { PlatformEventsToolbar } from './platform-events-toolbar'
import { PlatformShell } from './platform-shell'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; events: EventEntry[] }
  | { status: 'error' }

const MUTED = 'text-sm text-[var(--editorial-muted)]'

export function PlatformEventsPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    cryptopediaRepository
      .getEvents('all')
      .then((feed) => !cancelled && setState({ status: 'ready', events: feed.items }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])
  const router = useRouter()
  const selectedId = useSearchParams().get('event')
  const now = new Date()
  const today = calendarDay(now.toISOString())

  // This state lives here, not in the URL: opening a detail only changes ?event=, so the page stays mounted.
  const [view, setView] = useState<EditorialViewMode>('calendar')
  const [chains, setChains] = useState<string[]>([])
  const [savedOnly, setSavedOnly] = useState(false)
  const [day, setDay] = useState(today)
  const bookmarks = useEventBookmarks()

  const allEvents = state.status === 'ready' ? state.events : null
  const listed = useMemo(() => (allEvents ? listedEvents(allEvents) : []), [allEvents])
  const options = useMemo(() => chainOptions(listed), [listed])
  const savedIds = useMemo(() => new Set(bookmarks.ids), [bookmarks.ids])
  const savedCount = listed.filter((event) => savedIds.has(event.id)).length
  const shown = useMemo(
    () => filterPlatformEvents(listed, { chains, savedIds: savedOnly ? savedIds : null }),
    [listed, chains, savedOnly, savedIds]
  )
  const groups = groupPlatformEvents(shown, now)
  const filtering = chains.length > 0 || savedOnly

  // Any loaded event opens, listed or not, so a shared link to a past event still works.
  const selected = allEvents?.find((e) => e.id === selectedId) ?? null
  const shownIds = view === 'calendar' ? eventsOnDay(shown, day).map((e) => e.id) : listedEventIds(groups)
  const { previous, next } = selectedId ? neighbors(shownIds, selectedId) : { previous: null, next: null }
  const open = (id: string) => router.push(eventHref(id), { scroll: false })

  const toggleChain = (key: string) =>
    setChains((current) => (current.includes(key) ? current.filter((c) => c !== key) : [...current, key]))

  let emptyNote: string | null = null
  if (!shown.length && filtering) {
    emptyNote =
      savedOnly && savedCount === 0
        ? '아직 담은 관심 행사가 없어요. 행사 카드의 하트를 누르면 여기에 모아 볼 수 있어요.'
        : '조건에 맞는 행사가 없어요. 체인이나 관심 행사 선택을 바꿔 보세요.'
  }

  return (
    <PlatformShell>
      <main
        className={`mx-auto w-full px-4 pb-24 pt-28 sm:px-6 ${
          view === 'calendar' && allEvents ? 'max-w-[1120px]' : 'max-w-[760px]'
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-accent)]">
          Events
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[var(--editorial-strong)]">
          행사/이벤트
        </h1>
        <p className="mt-3 max-w-[640px] text-[15px] leading-7 text-[var(--editorial-muted)]">
          체인별로 행사를 골라 달력에서 보고, 하트를 눌러 관심 행사만 따로 모아 볼 수 있어요. 신청은 각 행사의 공식 페이지에서 해요.
        </p>
        <div className="mt-10">
          {state.status === 'loading' && <p className={MUTED}>행사를 불러오는 중…</p>}
          {state.status === 'error' && <p className={MUTED}>행사를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>}
          {allEvents && (
            <div className="space-y-6">
              <PlatformEventsToolbar
                view={view}
                onViewChange={setView}
                chains={options}
                selectedChains={chains}
                onToggleChain={toggleChain}
                onClearChains={() => setChains([])}
                savedOnly={savedOnly}
                savedCount={savedCount}
                onToggleSavedOnly={() => setSavedOnly((on) => !on)}
              />
              {view === 'calendar' ? (
                <>
                  {emptyNote && <p className={MUTED}>{emptyNote}</p>}
                  <PlatformEventsCalendarView events={shown} day={day} now={now} onSelectDay={setDay} />
                </>
              ) : emptyNote ? (
                <p className={MUTED}>{emptyNote}</p>
              ) : (
                <PlatformEventList groups={groups} now={now} />
              )}
            </div>
          )}
        </div>
        {allEvents && (view === 'calendar' || listed.length > 0) && (
          <Link
            href={ARCHIVE_HREF}
            className="mt-12 inline-block text-sm text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
          >
            지난 행사 →
          </Link>
        )}
      </main>
      <EventDetailPanel
        event={selected}
        previous={previous}
        next={next}
        onNavigate={open}
        onClose={() => router.push('/events', { scroll: false })}
        shareUrl={selected && typeof window !== 'undefined' ? `${window.location.origin}${eventHref(selected.id)}` : ''}
      />
    </PlatformShell>
  )
}
