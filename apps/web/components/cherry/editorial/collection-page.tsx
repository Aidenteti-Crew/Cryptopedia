import type { CollectionPageData } from "@/lib/cryptopedia-types"

import { ContentEntryList } from "./content-entry-list"

interface CollectionPageProps {
  data: CollectionPageData
  onOpenEntry: (id: string) => void
}

export function CollectionPage({ data, onOpenEntry }: CollectionPageProps) {
  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <p className="text-[11px] leading-4 text-[var(--editorial-muted)]">
        {data.breadcrumb.join("  /  ")}
      </p>

      <header className="mt-5">
        <p className="text-[11px] leading-4 text-[var(--editorial-accent)]">
          VOLUME {String(data.volume).padStart(2, "0")}
          <span className="px-3">—</span>
          {data.eyebrow}
        </p>
        <h1 className="editorial-display mt-4 text-[44px] leading-[1.15] text-[var(--editorial-ink)] lg:text-[56px]">
          {data.title}
        </h1>
        <p className="editorial-copy mt-5 text-xl leading-[1.5] text-[var(--editorial-ink)]">
          {data.tagline}
        </p>
        <div className="editorial-copy mt-3 text-sm leading-[1.5] text-[var(--editorial-muted)]">
          {data.introduction.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      <div className="mt-5 border-t border-[var(--editorial-line)] pt-5">
        <h2 className="text-base leading-6 text-[var(--editorial-ink)]">
          {data.sectionTitle}
          <span className="px-2">/</span>
          <span className="tabular-nums">
            {String(data.entries.length).padStart(2, "0")}
          </span>
        </h2>
        <div className="mt-4">
          <ContentEntryList entries={data.entries} onOpen={onOpenEntry} />
        </div>
      </div>

      <footer className="mt-5 space-y-2">
        <p className="text-base">읽고, 이해하고, 직접 만들어보세요.</p>
        <p className="text-xs text-[var(--editorial-muted)]">
          공식 문서와 연결되는 블록체인 지식 라이브러리
        </p>
        <div className="border-t border-[var(--editorial-line)] pt-2 text-[11px] text-[var(--editorial-muted)]">
          AIDENTETI CREW&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;CRYPTOPEDIA
        </div>
      </footer>
    </article>
  )
}
