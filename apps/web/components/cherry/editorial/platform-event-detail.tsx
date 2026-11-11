'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Link2, MapPin } from 'lucide-react'

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { EventEntry } from '@/lib/cryptopedia-types'
import { eventHost, eventLocation, eventTitle, eventWhen, scopeLabel, signUpUrl } from '@/lib/platform-events'

import { RegistrationBadge } from './registration-badge'

const CLOSED: ReadonlySet<EventEntry['status']> = new Set(['PAST', 'CANCELLED'])

// What the detail shows first, as on Luma: when, where, and how to sign up.
export function EventDetail({ event }: { event: EventEntry }) {
  const [imageFailed, setImageFailed] = useState(false)
  const when = eventWhen(event)
  const { host, summaryIsHost } = eventHost(event)
  const scope = scopeLabel(event)
  const signUp = signUpUrl(event)
  const canRegister = !!signUp && !CLOSED.has(event.status) && event.registrationStatus !== 'CLOSED'
  const addressLine = event.isOnline ? null : event.venueAddress
  return (
    <article className="space-y-6">
      {event.imageUrl && !imageFailed && (
        <img
          src={event.imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="mx-auto max-h-80 w-full border border-[var(--editorial-line)] object-cover"
        />
      )}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <RegistrationBadge {...event} />
          {scope && (
            <span data-color="violet" className="editorial-color-badge">
              {scope}
            </span>
          )}
          {event.status === 'CANCELLED' && (
            <span data-color="rose" className="editorial-color-badge">
              취소
            </span>
          )}
          {event.status === 'POSTPONED' && (
            <span data-color="orange" className="editorial-color-badge">
              연기
            </span>
          )}
        </div>
        <h2 className="mt-3 break-keep text-[24px] font-semibold leading-snug text-[var(--editorial-strong)] [overflow-wrap:anywhere]">
          {eventTitle(event.title)}
        </h2>
        {host && <p className="mt-2 text-sm text-[var(--editorial-muted)]">{host} 주최</p>}
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="border border-[var(--editorial-line)] p-4">
          <dt className="text-xs text-[var(--editorial-muted)]">언제</dt>
          <dd className="mt-1 text-[15px] text-[var(--editorial-strong)]">{when.day}</dd>
          <dd className="text-sm tabular-nums text-[var(--editorial-muted)]">{when.time} · 한국시간</dd>
        </div>
        <div className="border border-[var(--editorial-line)] p-4">
          <dt className="text-xs text-[var(--editorial-muted)]">어디서</dt>
          <dd className="mt-1 inline-flex items-start gap-1.5 text-[15px] text-[var(--editorial-strong)]">
            <MapPin size={15} aria-hidden className="mt-1 shrink-0" />
            {eventLocation(event) ?? '장소는 원문에서 확인해 주세요'}
          </dd>
          {addressLine && <dd className="text-sm text-[var(--editorial-muted)]">{addressLine}</dd>}
        </div>
      </dl>

      {canRegister ? (
        <a
          href={signUp!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-full items-center justify-center gap-1.5 bg-[var(--editorial-accent)] text-sm font-semibold text-[#1b1326]"
        >
          공식 페이지에서 신청
          <ExternalLink size={14} aria-hidden />
        </a>
      ) : (
        <p className="border border-[var(--editorial-line)] p-3 text-sm text-[var(--editorial-muted)]">
          {CLOSED.has(event.status) || event.registrationStatus === 'CLOSED'
            ? '신청이 끝난 행사예요.'
            : '신청 방법은 원문에서 확인해 주세요.'}
        </p>
      )}

      {event.summary && !summaryIsHost && (
        <section>
          <h3 className="text-xs text-[var(--editorial-muted)]">소개</h3>
          <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-7 text-[var(--editorial-ink)]">
            {event.summary}
          </p>
        </section>
      )}

      {event.sourceUrl && !(canRegister && event.sourceUrl === signUp) && (
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[var(--editorial-accent)]"
        >
          원문 보기
          <ExternalLink size={13} aria-hidden />
        </a>
      )}
    </article>
  )
}

export function EventDetailPanel({
  event,
  previous,
  next,
  onNavigate,
  onClose,
  shareUrl,
}: {
  event: EventEntry | null
  previous: string | null
  next: string | null
  onNavigate: (id: string) => void
  onClose: () => void
  shareUrl: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  const toolButton =
    'inline-flex h-9 items-center gap-1.5 border border-[var(--editorial-line)] px-3 text-sm text-[var(--editorial-strong)] hover:border-[var(--editorial-accent)] disabled:opacity-30'
  return (
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        closeLabel="상세 닫기"
        className="editorial-root editorial-dark w-full overflow-y-auto rounded-none border-[var(--editorial-line)] bg-[#1b1326] p-0 text-[#f3eefb] sm:max-w-[560px] [&>button]:z-20 [&>button]:top-5 [&>button]:text-[#f3eefb]"
      >
        <SheetTitle className="sr-only">{event ? eventTitle(event.title) : '행사 상세'}</SheetTitle>
        <SheetDescription className="sr-only">행사 일정, 장소, 신청 방법</SheetDescription>
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--editorial-line)] bg-[#1b1326] px-4 py-3 pr-14">
          <button type="button" onClick={copy} className={toolButton}>
            <Link2 size={14} aria-hidden />
            {copied ? '복사했어요' : '링크 복사'}
          </button>
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              aria-label="이전 행사"
              disabled={!previous}
              onClick={() => previous && onNavigate(previous)}
              className={toolButton}
            >
              <ChevronUp size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="다음 행사"
              disabled={!next}
              onClick={() => next && onNavigate(next)}
              className={toolButton}
            >
              <ChevronDown size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="px-5 py-6 sm:px-7">{event && <EventDetail event={event} />}</div>
      </SheetContent>
    </Sheet>
  )
}
