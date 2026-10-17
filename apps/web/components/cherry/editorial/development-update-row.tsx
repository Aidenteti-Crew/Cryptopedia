'use client'

import { ArrowUpRight, ChevronRight } from 'lucide-react'
import type { ContentEntry } from '@/lib/cryptopedia-types'
import {
  CHANGE_LABELS,
  NETWORK_LABELS,
  sourceLinkLabel,
  updateDateTime,
  updateKindLabel,
  updateProducts,
} from '@/lib/development-discovery'
import { updateContentColor } from './content-colors'

export function UpdateBadges({
  entry,
  showVersion = true,
}: {
  entry: ContentEntry
  showVersion?: boolean
}) {
  const products = updateProducts(entry)
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs leading-5">
      <span className="font-medium text-[var(--card-label,var(--editorial-accent))]">
        {products.map((p) => p.name).join(' · ') || 'Avalanche 생태계'}
      </span>
      <span aria-hidden="true" className="text-white/20">
        /
      </span>
      <span data-color={updateContentColor(entry)} className="editorial-color-badge">
        {updateKindLabel(entry)}
      </span>
      {showVersion && entry.version && (
        <span className="rounded border border-white/10 bg-white/[.025] px-1.5 font-mono text-[11px] text-[#d9e1e9]">
          {entry.version}
        </span>
      )}
      {entry.network && entry.network !== 'OTHER' && (
        <span>{NETWORK_LABELS[entry.network] ?? '미확인'}</span>
      )}
    </div>
  )
}

export function UpdateSourceLink({ entry }: { entry: ContentEntry }) {
  return entry.sourceUrl ? (
    <a
      href={entry.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-8 items-center gap-1 text-xs text-[var(--editorial-accent)] underline-offset-4 hover:underline"
    >
      {sourceLinkLabel(entry)}
      <ArrowUpRight size={13} />
    </a>
  ) : null
}

export function DevelopmentUpdateRow({
  entry,
  onOpen,
  versionFirst = false,
  compact = false,
  selected = false,
}: {
  entry: ContentEntry
  onOpen: (id: string) => void
  versionFirst?: boolean
  timeline?: boolean
  compact?: boolean
  selected?: boolean
}) {
  return (
    <article data-tone="updates" data-selected={selected} className="editorial-content-card group">
      <div className="editorial-card-meta">
        <UpdateBadges entry={entry} showVersion={!versionFirst} />
      </div>
      <button
        type="button"
        onClick={() => onOpen(entry.id)}
        aria-current={selected ? 'true' : undefined}
        className="mt-2.5 flex w-full items-start justify-between gap-3 text-left outline-offset-4"
      >
        <h3
          className={`${versionFirst ? 'font-mono text-[21px]' : 'text-[17px]'} break-keep font-semibold leading-7 tracking-[-.02em] text-[var(--editorial-ink)] transition-colors [overflow-wrap:anywhere] group-hover:text-[var(--editorial-accent)]`}
        >
          {versionFirst ? (entry.version ?? entry.title) : entry.title}
        </h3>
        <ChevronRight
          size={17}
          className="mt-1.5 shrink-0 text-[var(--editorial-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--editorial-accent)]"
        />
      </button>
      {versionFirst && entry.version && (
        <p className="mt-1.5 text-sm leading-6 text-[#cbd3dc]">{entry.title}</p>
      )}
      {!compact && entry.summary && (
        <p className="mt-2 line-clamp-2 break-words text-sm leading-[1.8] text-[var(--editorial-muted)]">
          {entry.summary}
        </p>
      )}
      <div className={compact ? 'hidden' : 'mt-3 flex flex-wrap items-center gap-x-4 gap-y-1'}>
        {entry.changeFlags?.map((flag) => (
          <span key={flag.kind} className="text-[11px] font-medium text-[var(--editorial-accent)]">
            {CHANGE_LABELS[flag.kind]}
          </span>
        ))}
        {entry.activations?.map((activation) => (
          <span key={`${activation.network}-${activation.at}`} className="text-xs text-[#b9c9d3]">
            {NETWORK_LABELS[activation.network]} 적용 일정 · {updateDateTime(activation.at)} KST
          </span>
        ))}
        <UpdateSourceLink entry={entry} />
        {versionFirst && entry.compareUrl && (
          <a
            href={entry.compareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center gap-1 text-xs text-[var(--editorial-accent)] hover:underline"
          >
            이전 버전과 비교
            <ArrowUpRight size={13} />
          </a>
        )}
      </div>
    </article>
  )
}
