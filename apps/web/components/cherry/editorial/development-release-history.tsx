'use client'

import type { ContentEntry } from '@/lib/cryptopedia-types'
import { calendarDay } from '@/lib/editorial-discovery'
import { releaseStage } from '@/lib/development-discovery'
import { DevelopmentUpdateRow } from './development-update-row'
import { EditorialEmpty } from './editorial-states'

export function ReleaseHistory({
  productName,
  entries,
  onOpen,
  compact = false,
  selectedId,
}: {
  productName: string
  entries: ContentEntry[]
  onOpen?: (id: string) => void
  compact?: boolean
  selectedId?: string
}) {
  const open = (id: string) => {
    if (onOpen) onOpen(id)
    else {
      const url = entries.find((entry) => entry.id === id)?.sourceUrl
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
  return (
    <section aria-label={`${productName} 릴리스 타임라인`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="sr-only">{productName} 릴리스 이력</h2>
        <span className="text-[11px] text-[var(--editorial-muted)]">공개일 · 한국시간</span>
        <div
          aria-label="릴리스 단계 표시"
          className="flex items-center gap-4 text-[11px] text-[var(--editorial-muted)]"
        >
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-[var(--editorial-accent)]"
            />
            정식
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full border border-[var(--editorial-accent)]"
            />
            출시 후보·프리릴리스
          </span>
        </div>
      </div>
      {entries.length ? (
        <ol aria-label={`${productName} 버전 공개 순서`} className="ml-1 list-none p-0">
          {entries.map((entry, index) => {
            const stage = releaseStage(entry)
            return (
              <li
                key={entry.id}
                className={`relative pb-7 pl-7 last:pb-0 sm:pl-9 ${stage === 'prerelease' ? '[&_h3]:text-[#b7c1cc]' : ''}`}
              >
                {index < entries.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-[5px] top-2 w-px bg-[#cebd91]/25"
                  />
                )}
                <span
                  aria-hidden="true"
                  data-release-stage={stage}
                  className={`absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 ${stage === 'stable' ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)]' : stage === 'prerelease' ? 'border-[var(--editorial-accent)] bg-[var(--editorial-paper)]' : 'border-[#7f8c9d] bg-[var(--editorial-paper)]'}`}
                />
                <div className="mb-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-[var(--editorial-muted)]">
                  {entry.publishedAt ? (
                    <time dateTime={entry.publishedAt} className="font-medium tabular-nums">
                      {calendarDay(entry.publishedAt).replaceAll('-', '.')}
                    </time>
                  ) : (
                    <span>공개일 미제공</span>
                  )}
                  {stage === 'unknown' && <span className="text-[10px]">릴리스 단계 미확인</span>}
                </div>
                <DevelopmentUpdateRow
                  entry={entry}
                  onOpen={open}
                  versionFirst
                  timeline
                  compact={compact}
                  selected={entry.id === selectedId}
                />
              </li>
            )
          })}
        </ol>
      ) : (
        <EditorialEmpty message="선택한 제품에 조건과 일치하는 릴리스가 없습니다." />
      )}
    </section>
  )
}
