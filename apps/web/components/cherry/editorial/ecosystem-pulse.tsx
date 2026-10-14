import type { ContentEntry } from '@/lib/cryptopedia-types'
import { sortHomeNews } from '@/lib/cryptopedia-home'

type PulseScreen = 'macro' | 'events' | 'updates'

const COLUMNS: { screen: PulseScreen; label: string; kinds: string[] }[] = [
  { screen: 'macro', label: '매크로 소식', kinds: ['MACRO'] },
  { screen: 'events', label: '행사·이벤트', kinds: ['EVENT'] },
  { screen: 'updates', label: '개발 업데이트', kinds: ['DEV', 'UPDATE'] },
]
const PER_COLUMN = 2

function formatDate(entry: ContentEntry) {
  const iso = entry.startsAt ?? entry.publishedAt
  return iso ? iso.slice(0, 10).replaceAll('-', '.') : null
}

/* Ecosystem Pulse — 수집된 최신 콘텐츠를 분야별로 1~2개만 요약한다.
   실제 데이터가 없으면 임의의 뉴스·날짜·행사를 만들지 않는다.
   빈 상태는 한 번만, 간결하게 보여 준다 (칸마다 같은 문구를 반복하지 않는다):
   · 세 분야 모두 비어 있음 → 한 줄 안내 + 분야 바로가기 (피드 연결 불가인지 아직 소식이 없는지만 구분)
   · 일부 분야만 비어 있음 → 해당 칸에 "새 소식 없음"만 */
export function EcosystemPulse({
  entries,
  feed,
  onOpenScreen,
  onOpenEntry,
}: {
  entries: ContentEntry[]
  feed: 'live' | 'unavailable'
  onOpenScreen: (id: PulseScreen) => void
  onOpenEntry: (id: string) => void
}) {
  const sorted = sortHomeNews(entries)
  const columns = COLUMNS.map((column) => ({
    ...column,
    items: sorted.filter((entry) => column.kinds.includes(entry.kind)).slice(0, PER_COLUMN),
  }))

  if (columns.every((column) => column.items.length === 0)) {
    return (
      <div className="border-y border-[var(--editorial-line)] py-6">
        <p className="text-[14px] leading-6 text-[var(--editorial-muted)]">
          {feed === 'unavailable'
            ? '소식 피드에 연결되면 최신 소식이 이곳에 표시됩니다.'
            : '아직 수집된 소식이 없습니다.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          {columns.map((column) => (
            <button
              key={column.screen}
              type="button"
              onClick={() => onOpenScreen(column.screen)}
              className="min-h-9 text-[13px] font-medium text-[var(--editorial-accent)] hover:text-[var(--editorial-strong)]"
            >
              {column.label} →
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-x-12 gap-y-8 md:grid-cols-3">
      {columns.map((column) => (
        <div key={column.screen}>
          <div className="flex items-baseline justify-between border-b border-[var(--editorial-line)] pb-3">
            <h3 className="text-[15px] font-medium text-[var(--editorial-strong)]">{column.label}</h3>
            <button
              type="button"
              onClick={() => onOpenScreen(column.screen)}
              className="text-[12px] text-[var(--editorial-accent)] hover:text-[var(--editorial-strong)]"
            >
              더 보기 →
            </button>
          </div>
          {column.items.length > 0 ? (
            <ul>
              {column.items.map((entry) => {
                const date = formatDate(entry)
                const external = entry.sourceUrl && /^https?:\/\//.test(entry.sourceUrl)
                const body = (
                  <>
                    <span className="block text-[12px] text-[var(--editorial-muted)]">
                      {[date, entry.sourceName].filter(Boolean).join(' · ') || '출처 정보 없음'}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[15px] leading-6 text-[var(--editorial-ink)] group-hover:text-[var(--editorial-accent)]">
                      {entry.title}
                    </span>
                  </>
                )
                const rowClass = 'group block w-full border-b border-[var(--editorial-line)] py-4 text-left'
                return (
                  <li key={entry.id}>
                    {external ? (
                      <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className={rowClass}>
                        {body}
                      </a>
                    ) : (
                      <button type="button" onClick={() => onOpenEntry(entry.id)} className={rowClass}>
                        {body}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="border-b border-[var(--editorial-line)] py-4 text-[13px] text-[var(--editorial-muted)]">
              새 소식 없음
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
