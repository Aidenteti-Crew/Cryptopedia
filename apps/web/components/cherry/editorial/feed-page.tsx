import type { ContentEntry } from "@/lib/cryptopedia-types"

import { ContentEntryList } from "./content-entry-list"
import { EditorialEmpty } from "./editorial-states"

interface FeedPageProps {
  eyebrow: string
  title: string
  introduction: string
  filters: string[]
  entries: ContentEntry[]
  onOpenEntry: (id: string) => void
}

export function FeedPage({
  eyebrow,
  title,
  introduction,
  filters,
  entries,
  onOpenEntry,
}: FeedPageProps) {
  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <p className="text-[11px] text-[var(--editorial-muted)]">
        ← 생태계 · 매크로
      </p>
      <p className="mt-5 text-[11px] text-[var(--editorial-accent)]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-[34px] font-normal leading-[1.55]">
        {title}
      </h1>
      <p className="editorial-copy mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
        {introduction}
      </p>

      <div className="mt-7 flex flex-col gap-2 border-y border-[var(--editorial-line)] py-4 text-xs text-[var(--editorial-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>{filters.join(" · ")}</span>
        <span>최신 등록순</span>
      </div>

      {entries.length > 0 ? (
        <ContentEntryList entries={entries} onOpen={onOpenEntry} />
      ) : (
        <EditorialEmpty message="수집 데이터가 연결되면 최신 자료가 표시됩니다." />
      )}

      <footer className="mt-8 border-t border-[var(--editorial-line)] pt-3 text-[11px] text-[var(--editorial-muted)]">
        AIDENTETI CREW / CRYPTOPEDIA
      </footer>
    </article>
  )
}
