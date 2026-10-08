import type { EcosystemPageData } from "@/lib/cryptopedia-types"

import { ContentEntryList } from "./content-entry-list"

interface EcosystemPageProps {
  data: EcosystemPageData
  onOpenScreen: (id: "projects" | "macro" | "events" | "updates") => void
  onOpenLatest: (id: string) => void
}

export function EcosystemPage({
  data,
  onOpenScreen,
  onOpenLatest,
}: EcosystemPageProps) {
  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <p className="text-[11px] text-[var(--editorial-muted)]">
        {data.breadcrumb.join(" / ")}
      </p>
      <p className="mt-5 text-[11px] text-[var(--editorial-accent)]">
        {data.eyebrow}
      </p>
      <h1 className="editorial-display mt-3 text-[44px] leading-[1.15] lg:text-[56px]">
        {data.title}
      </h1>
      <p className="mt-4 text-xl">{data.tagline}</p>
      <div className="editorial-copy mt-3 text-sm leading-6 text-[var(--editorial-muted)]">
        {data.introduction.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <section className="mt-6 border-t border-[var(--editorial-line)] pt-5">
        <h2 className="text-base">생태계 · 매크로</h2>
        <div className="mt-4">
          {data.entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onOpenScreen(entry.id)}
              className="group flex min-h-[95px] w-full items-start gap-6 border-b border-[var(--editorial-line)] py-5 text-left"
            >
              <span className="w-11 shrink-0 text-[10px] text-[var(--editorial-accent)]">
                {entry.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] group-hover:text-[var(--editorial-accent)]">
                  {entry.title}
                </span>
                <span className="mt-1.5 block text-sm text-[var(--editorial-muted)]">
                  {entry.summary}
                </span>
              </span>
              <span className="text-xl">↗</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-xl">최근 수집 소식</h2>
        <p className="mt-3 text-xs text-[var(--editorial-muted)]">
          전체 분류 · 최신 게시순
        </p>
        <div className="mt-4">
          <ContentEntryList entries={data.latest} onOpen={onOpenLatest} />
        </div>
      </section>

      <footer className="mt-6 space-y-2">
        <p className="text-base">출처에서 시작하는 생태계 탐색</p>
        <p className="text-xs text-[var(--editorial-muted)]">
          수집된 자료의 원문, 게시일과 수집 시각을 함께 확인하세요.
        </p>
        <div className="border-t border-[var(--editorial-line)] pt-2 text-[11px] text-[var(--editorial-muted)]">
          AIDENTETI CREW&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;CRYPTOPEDIA
        </div>
      </footer>
    </article>
  )
}
