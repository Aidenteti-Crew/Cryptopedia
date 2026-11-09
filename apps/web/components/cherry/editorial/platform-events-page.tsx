'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { EventEntry } from '@/lib/cryptopedia-types'
import { cryptopediaRepository } from '@/lib/cryptopedia-repository'
import { groupPlatformEvents } from '@/lib/platform-events'

import { AboutHeader } from './about-header'
import { ARCHIVE_HREF, PlatformEventList } from './platform-event-list'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; events: EventEntry[] }
  | { status: 'error' }

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
  const now = new Date()
  const groups = state.status === 'ready' ? groupPlatformEvents(state.events, now) : null
  const hasEvents = !!groups && (groups.ongoing.length > 0 || groups.days.length > 0)
  return (
    // Not the landing's .landing class: it turns on page-wide scroll snapping, wrong for a long list.
    <div className="editorial-root editorial-dark min-h-[100dvh] bg-[#1b1326] text-[#f3eefb]">
      {/* The shared header fades out over the landing hero; a list scrolling under it needs a solid band. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-16 bg-[#1b1326] lg:h-[88px]" />
      <AboutHeader />
      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-28 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-accent)]">
          Events
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[var(--editorial-strong)]">
          행사/이벤트
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-muted)]">
          국내 Web3와 체인별 행사를 날짜순으로 모았어요. 신청은 각 행사의 공식 페이지에서 해요.
        </p>
        <div className="mt-10">
          {state.status === 'loading' && (
            <p className="text-sm text-[var(--editorial-muted)]">행사를 불러오는 중…</p>
          )}
          {state.status === 'error' && (
            <p className="text-sm text-[var(--editorial-muted)]">
              행사를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
            </p>
          )}
          {groups && <PlatformEventList groups={groups} now={now} />}
        </div>
        {hasEvents && (
          <Link
            href={ARCHIVE_HREF}
            className="mt-12 inline-block text-sm text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
          >
            지난 행사 →
          </Link>
        )}
      </main>
    </div>
  )
}
