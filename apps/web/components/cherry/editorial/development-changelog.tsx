'use client'

import { ChevronRight } from 'lucide-react'
import type { ContentEntry } from '@/lib/cryptopedia-types'
import { calendarDay } from '@/lib/editorial-discovery'
import {
  CHANGE_LABELS,
  NETWORK_LABELS,
  updateDateTime,
  updateKindLabel,
  updateProducts,
} from '@/lib/development-discovery'
import { UpdateSourceLink } from './development-update-row'
import { updateContentColor } from './content-colors'

export function DevelopmentChangelog({
  entries,
  onOpen,
  onProductSelect,
  compact = false,
  selectedId,
}: {
  entries: ContentEntry[]
  onOpen: (id: string) => void
  onProductSelect: (id: string) => void
  compact?: boolean
  selectedId?: string
}) {
  const months = new Map<string, ContentEntry[]>()
  for (const entry of entries) {
    const month = entry.publishedAt ? calendarDay(entry.publishedAt).slice(0, 7) : 'unknown'
    const group = months.get(month) ?? []
    group.push(entry)
    months.set(month, group)
  }
  return (
    <div aria-label="월별 개발 업데이트">
      {[...months].map(([month, items]) => (
        <section key={month} className="mb-10 last:mb-0">
          <h2 className="flex items-baseline gap-3 border-b border-white/15 pb-4 text-xl font-semibold tracking-[-.03em] sm:text-2xl">
            {month === 'unknown'
              ? '공개일 미제공'
              : `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`}
            <span className="text-xs font-normal tabular-nums text-[var(--editorial-muted)]">
              {items.length}개
            </span>
          </h2>
          <ol className="mt-4 list-none space-y-3 p-0">
            {items.map((entry) => {
              const products = updateProducts(entry)
              const color =
                entry.subKind === 'RELEASE'
                  ? 'text-[#a2d7c1]'
                  : entry.subKind === 'BLOG'
                    ? 'text-[#c7b2e7]'
                    : 'text-[#a9bde9]'
              return (
                <li
                  key={entry.id}
                  data-tone="updates"
                  data-selected={entry.id === selectedId}
                  className="editorial-content-card"
                >
                  <div className="editorial-card-meta flex flex-wrap items-center gap-x-3 gap-y-2">
                    {entry.publishedAt && (
                      <time dateTime={entry.publishedAt} className="font-medium tabular-nums">
                        {calendarDay(entry.publishedAt).slice(5).replace('-', '.')}
                      </time>
                    )}
                    <span
                      data-color={updateContentColor(entry)}
                      className={`editorial-color-badge ${color}`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                      />
                      {updateKindLabel(entry)}
                    </span>
                  </div>
                  <article className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpen(entry.id)}
                      aria-current={entry.id === selectedId ? 'true' : undefined}
                      className="group flex w-full items-start justify-between gap-4 text-left"
                    >
                      <h3 className="break-keep text-[17px] font-semibold leading-7 tracking-[-.02em] text-[var(--editorial-ink)] [overflow-wrap:anywhere] group-hover:text-[var(--editorial-accent)] sm:text-lg">
                        {entry.title}
                      </h3>
                      <ChevronRight
                        size={16}
                        className="mt-1.5 shrink-0 text-[var(--editorial-muted)] group-hover:text-[var(--editorial-accent)]"
                      />
                    </button>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                      {products.length ? (
                        products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            aria-label={`${p.name} 업데이트만 보기`}
                            onClick={() => onProductSelect(p.id)}
                            className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[var(--editorial-accent)] hover:border-[var(--editorial-accent)]"
                          >
                            {p.name}
                          </button>
                        ))
                      ) : (
                        <span className="text-[var(--editorial-muted)]">Avalanche 생태계</span>
                      )}
                      {entry.version && (
                        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[#cbd3dc]">
                          {entry.version}
                        </span>
                      )}
                      {entry.changeFlags?.map((flag) => (
                        <span key={flag.kind} className="text-[#ddcca5]">
                          {CHANGE_LABELS[flag.kind]}
                        </span>
                      ))}
                    </div>
                    {!compact && !!entry.activations?.length && (
                      <div className="mt-2 space-y-1 text-xs leading-5 text-[var(--editorial-muted)]">
                        {entry.activations.map((a) => (
                          <p key={`${a.network}-${a.at}`}>
                            {NETWORK_LABELS[a.network]} 적용 일정 · {updateDateTime(a.at)} KST
                          </p>
                        ))}
                      </div>
                    )}
                    <div className={compact ? 'hidden' : 'mt-1'}>
                      <UpdateSourceLink entry={entry} />
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
