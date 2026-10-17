'use client'

import { useId, useRef, type RefObject } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { ContentEntry } from '@/lib/cryptopedia-types'
import { calendarDay } from '@/lib/editorial-discovery'
import { CHANGE_LABELS, NETWORK_LABELS, updateDateTime } from '@/lib/development-discovery'
import { UpdateBadges, UpdateSourceLink } from './development-update-row'

export function DevelopmentUpdateDetail({
  entry,
  onClose,
  returnFocus,
  inline = false,
}: {
  entry: ContentEntry | null
  onClose: () => void
  returnFocus: RefObject<HTMLElement | null>
  inline?: boolean
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const evidenceGroups = [
    ...new Map(
      entry?.changeFlags?.map((flag) => [
        `${flag.sourceUrl}:${flag.evidence}`,
        {
          ...flag,
          labels: entry
            .changeFlags!.filter(
              (f) => f.sourceUrl === flag.sourceUrl && f.evidence === flag.evidence
            )
            .map((f) => CHANGE_LABELS[f.kind])
            .join(' · '),
        },
      ]) ?? []
    ).values(),
  ]
  const descriptionId = useId()
  const Title = inline ? 'h2' : SheetTitle
  const Description = inline ? 'p' : SheetDescription
  const content = entry ? (
    <div className={inline ? 'p-5 sm:p-6' : 'px-6 pb-10 pt-16 sm:px-9'}>
      <UpdateBadges entry={entry} />
      <Title
        ref={heading}
        tabIndex={-1}
          className="mt-5 break-keep text-[22px] font-semibold leading-[1.5] tracking-[-.03em] !text-[#e9edf2] outline-none [overflow-wrap:anywhere]"
      >
        {entry.title}
      </Title>
      <Description id={descriptionId} className="mt-4 text-xs !text-[#a5afbb]">
        공개일 {entry.publishedAt ? calendarDay(entry.publishedAt).replaceAll('-', '.') : '미제공'}{' '}
        · 한국시간 기준{entry.sourceName && ` · ${entry.sourceName}`}
      </Description>
      <section className="mt-8 border-t border-white/10 pt-6">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--editorial-accent)]">
          변경 내용
        </h3>
        <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-[1.95] text-[#cbd3dc]">
          {entry.summary || '요약이 제공되지 않았습니다. 공식 원문에서 변경 내용을 확인하세요.'}
        </p>
      </section>
      {!!evidenceGroups.length && (
        <section className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-sm font-semibold">영향 및 공식 근거</h3>
          <div className="mt-4 space-y-5">
            {evidenceGroups.map((flag) => (
              <div key={`${flag.sourceUrl}:${flag.evidence}`}>
                <h4 className="text-xs font-medium text-[var(--editorial-accent)]">{flag.labels}</h4>
                <blockquote
                  lang="en"
                  className="mt-2 break-words border-l border-[var(--discovery-line)] pl-3 text-sm leading-7 text-[var(--editorial-muted)]"
                >
                  {flag.evidence}
                </blockquote>
                <a
                  href={flag.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs text-[var(--editorial-accent)]"
                >
                  공식 근거 확인
                  <ArrowUpRight size={12} />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
      {!!entry.activations?.length && (
        <section className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-sm font-semibold">네트워크 적용 일정</h3>
          <p className="mt-2 text-xs leading-5 text-[#a5afbb]">공식 원문에 명시된 일정입니다.</p>
          <dl className="mt-4 space-y-4">
            {entry.activations.map((activation) => (
              <div
                key={`${activation.network}-${activation.at}`}
                className="rounded-[18px] border border-white/[.08] bg-white/[.025] p-4"
              >
                <dt className="text-xs text-[var(--editorial-accent)]">
                  {NETWORK_LABELS[activation.network]}
                </dt>
                <dd className="mt-2 text-sm tabular-nums">
                  {updateDateTime(activation.at)} KST
                  <span className="mt-1 block text-xs text-[#a5afbb]">
                    {updateDateTime(activation.at, 'UTC')} UTC
                  </span>
                  <a
                    href={activation.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs text-[var(--editorial-accent)] underline underline-offset-4"
                  >
                    적용 일정 출처
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <footer className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6">
        <UpdateSourceLink entry={entry} />
        {entry.compareUrl && (
          <a
            href={entry.compareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center gap-1 text-xs text-[var(--editorial-accent)]"
          >
            이전 버전과 비교
            <ArrowUpRight size={13} />
          </a>
        )}
      </footer>
    </div>
  ) : null
  if (inline) return content
  return (
    <Sheet
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        closeLabel="상세 닫기"
        aria-describedby={descriptionId}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          heading.current?.focus()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus.current?.focus()
        }}
        className="editorial-root !min-h-0 !w-full overflow-y-auto border-white/10 !bg-[var(--discovery-surface)] !p-0 !text-[#e9edf2] sm:!max-w-[620px] [&>button]:right-5 [&>button]:top-6 [&>button]:p-2"
      >
        {content}
      </SheetContent>
    </Sheet>
  )
}
