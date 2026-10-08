import type { ContentEntry } from "@/lib/cryptopedia-types"

interface ContentEntryRowProps {
  entry: ContentEntry
  onOpen: (id: string) => void
}

export function ContentEntryRow({ entry, onOpen }: ContentEntryRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      className="group flex min-h-[95px] w-full items-start gap-4 border-b border-[var(--editorial-line)] py-5 text-left sm:gap-6"
    >
      <span className="w-7 shrink-0 pt-0.5 text-xs tabular-nums text-[var(--editorial-accent)] sm:w-11">
        {entry.order === undefined ? "" : String(entry.order).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-6 text-[var(--editorial-ink)] group-hover:text-[var(--editorial-accent)]">
          {entry.title}
        </span>
        <span className="editorial-copy mt-1.5 block text-sm leading-[1.5] text-[var(--editorial-muted)]">
          {entry.summary}
          <span aria-hidden="true">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <span className="whitespace-nowrap text-xs">{entry.kind}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="w-6 shrink-0 text-right text-xl text-[var(--editorial-ink)] group-hover:text-[var(--editorial-accent)]"
      >
        ↗
      </span>
    </button>
  )
}
