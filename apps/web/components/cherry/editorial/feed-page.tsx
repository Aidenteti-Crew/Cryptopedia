import type { ContentEntry } from '@/lib/cryptopedia-types'

import { ContentEntryList } from './content-entry-list'
import { EditorialEmpty } from './editorial-states'

interface FeedPageProps {
  title: string
  introduction: string
  filters: string[]
  entries: ContentEntry[]
  onOpenEntry?: (id: string) => void
}

export function FeedPage({
  title,
  introduction,
  filters,
  entries,
  onOpenEntry,
}: FeedPageProps) {
  return (
    <article className="px-5 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]">
      <h1 className="text-[34px] font-normal leading-[1.55]">{title}</h1>
      <p className="editorial-copy mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
        {introduction}
      </p>

      <div className="mt-7 flex flex-col gap-2 border-y border-[var(--editorial-line)] py-4 text-xs text-[var(--editorial-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>{filters.join(' · ')}</span>
        <span>최신 등록순</span>
      </div>

      {entries.length > 0 ? (
        <ContentEntryList entries={entries} onOpen={onOpenEntry} />
      ) : (
        <EditorialEmpty message="수집 데이터가 연결되면 최신 자료가 표시됩니다." />
      )}
    </article>
  )
}
