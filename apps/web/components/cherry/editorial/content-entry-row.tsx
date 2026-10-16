import type { ContentEntry } from '@/lib/cryptopedia-types'
import { calendarDay } from '@/lib/editorial-discovery'
import { isReleaseCandidate } from '@/lib/development-updates'

const KIND_LABELS: Record<string, string> = {
  COLLAB: '협업·도입',
  VOLUME: '거래·시장 지표',
  RELEASE: '릴리스',
  ACP: 'ACP 제안',
  BLOG: '기술 글',
}

interface ContentEntryRowProps {
  entry: ContentEntry
  onOpen?: (id: string) => void
}

export function ContentEntryRow({ entry, onOpen }: ContentEntryRowProps) {
  const date = entry.publishedAt ? calendarDay(entry.publishedAt).replaceAll('-', '.') : null
  const label = isReleaseCandidate(entry)
    ? '출시 후보'
    : entry.subKind
      ? KIND_LABELS[entry.subKind]
      : undefined
  const isFeed = entry.kind === 'MACRO' || entry.kind === 'UPDATE'
  const content = (
    <>
      {!isFeed && (
        <span className="w-7 shrink-0 pt-0.5 text-xs tabular-nums text-[var(--editorial-accent)] sm:w-11">
          {entry.order === undefined ? '' : String(entry.order).padStart(2, '0')}
        </span>
      )}
      <span className="min-w-0 flex-1">
        {isFeed && (
          <span className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-[var(--editorial-muted)]">
            <span className="tabular-nums text-[var(--editorial-accent)]">
              {date ?? '발행일 미제공'}
            </span>
            {entry.sourceName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{entry.sourceName}</span>
              </>
            )}
            {label && (
              <span className="rounded border border-[var(--editorial-line)] px-1.5 py-0.5 text-[11px]">
                {label}
              </span>
            )}
          </span>
        )}
        <span className="block text-[17px] font-semibold leading-6 text-[var(--editorial-ink)] group-hover:text-[var(--editorial-accent)]">
          {entry.title}
        </span>
        <span
          className={`editorial-copy block text-sm text-[var(--editorial-muted)] ${isFeed ? 'mt-2 line-clamp-3 leading-6' : 'mt-1 leading-[1.5]'}`}
        >
          {entry.summary}
          {!isFeed && <span className="whitespace-nowrap text-xs"> · {entry.kind}</span>}
        </span>
        {entry.kind === 'UPDATE' && (entry.version || entry.activatedAt) && (
          <span className="mt-2 block text-xs text-[var(--editorial-muted)]">
            {entry.version && `버전 ${entry.version}`}
            {entry.version && entry.activatedAt && ' · '}
            {entry.activatedAt &&
              `적용일 ${calendarDay(entry.activatedAt).replaceAll('-', '.')} (KST)`}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="w-6 shrink-0 text-right text-xl text-[var(--editorial-ink)] group-hover:text-[var(--editorial-accent)]"
      >
        ↗
      </span>
    </>
  )
  const className = isFeed
    ? 'editorial-content-card group mb-3 flex min-h-[120px] w-full items-start gap-4 text-left'
    : 'group flex w-full items-start gap-4 border-b border-[var(--editorial-line)] py-4 text-left sm:gap-6'
  if (onOpen)
    return (
      <button type="button" onClick={() => onOpen(entry.id)} className={className}>
        {content}
      </button>
    )
  if (entry.sourceUrl)
    return (
      <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  return <div className={className}>{content}</div>
}
