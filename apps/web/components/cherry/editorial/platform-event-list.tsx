'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'

import type { EventEntry } from '@/lib/cryptopedia-types'
import {
  dayHeading,
  eventHost,
  eventHref,
  eventLocation,
  scopeLabel,
  type PlatformEventGroups,
} from '@/lib/platform-events'

import { RegistrationBadge } from './registration-badge'

export const ARCHIVE_HREF = '/knowledge/events/archive'

const time = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: 'numeric',
  minute: '2-digit',
})

function PlatformEventCard({ event }: { event: EventEntry }) {
  const [imageFailed, setImageFailed] = useState(false)
  const { host } = eventHost(event)
  const scope = scopeLabel(event)
  const link =
    event.registrationUrl && event.status !== 'POSTPONED'
      ? { href: event.registrationUrl, label: '공식 페이지에서 신청' }
      : event.sourceUrl
        ? { href: event.sourceUrl, label: '원문 보기' }
        : null
  return (
    <article className="relative flex gap-4 border border-[var(--editorial-line)] bg-[var(--editorial-wash)] p-5 hover:border-[var(--editorial-accent)]">
      <div className="min-w-0 flex-1">
        <p className="text-sm tabular-nums text-[var(--editorial-muted)]">
          {event.allDay ? '종일' : time.format(new Date(event.startsAt))}
          {event.status === 'POSTPONED' && ' · 연기됨'}
        </p>
        <h3 className="mt-1.5 break-keep text-[18px] font-semibold leading-7 text-[var(--editorial-strong)] [overflow-wrap:anywhere]">
          <Link
            href={eventHref(event.id)}
            scroll={false}
            className="hover:text-[var(--editorial-accent)] after:absolute after:inset-0"
          >
            {event.title}
          </Link>
        </h3>
        {host && <p className="mt-2 text-sm text-[var(--editorial-muted)]">{host} 주최</p>}
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--editorial-muted)]">
          <MapPin size={14} aria-hidden />
          {eventLocation(event)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RegistrationBadge {...event} />
          {scope && (
            <span data-color="violet" className="editorial-color-badge">
              {scope}
            </span>
          )}
        </div>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mt-4 inline-flex min-h-8 items-center gap-1 text-sm text-[var(--editorial-accent)]"
          >
            {link.label}
            <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </div>
      {event.imageUrl && !imageFailed && (
        <img
          src={event.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-20 w-20 shrink-0 border border-[var(--editorial-line)] object-cover sm:h-28 sm:w-28"
        />
      )}
    </article>
  )
}

function DaySection({ heading, events }: { heading: { date: string; weekday: string }; events: EventEntry[] }) {
  return (
    <section className="relative pl-6">
      <span aria-hidden className="absolute left-0 top-2 h-2 w-2 bg-[var(--editorial-accent)]" />
      <h2 className="text-base font-semibold text-[var(--editorial-strong)]">
        {heading.date} <span className="font-normal text-[var(--editorial-muted)]">{heading.weekday}</span>
      </h2>
      <div className="mt-3 space-y-3">
        {events.map((event) => (
          <PlatformEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}

export function PlatformEventList({ groups, now }: { groups: PlatformEventGroups; now: Date }) {
  if (!groups.ongoing.length && !groups.days.length) {
    return (
      <div className="border border-[var(--editorial-line)] p-6">
        <p className="text-[15px] text-[var(--editorial-strong)]">지금 모집 중이거나 다가오는 행사가 없어요.</p>
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          새 행사는 수집되는 대로 이곳에 올라와요. 그동안 지난 행사를 둘러볼 수 있어요.
        </p>
        <Link href={ARCHIVE_HREF} className="mt-4 inline-block text-sm text-[var(--editorial-accent)]">
          지난 행사 보기 →
        </Link>
      </div>
    )
  }
  return (
    <div className="relative space-y-10 before:absolute before:bottom-0 before:left-[3px] before:top-3 before:w-px before:bg-[var(--editorial-line)]">
      {!!groups.ongoing.length && (
        <DaySection heading={{ date: '진행 중', weekday: '' }} events={groups.ongoing} />
      )}
      {groups.days.map(([day, events]) => (
        <DaySection key={day} heading={dayHeading(day, now)} events={events} />
      ))}
    </div>
  )
}
