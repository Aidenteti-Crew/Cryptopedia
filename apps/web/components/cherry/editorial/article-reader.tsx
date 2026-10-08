import type { ArticleDetail } from "@/lib/cryptopedia-types"

import { ContentEntryList } from "./content-entry-list"

interface ArticleReaderProps {
  article: ArticleDetail
  onBack: () => void
  onOpenRelated: (id: string) => void
}

export function ArticleReader({
  article,
  onBack,
  onOpenRelated,
}: ArticleReaderProps) {
  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <button
        type="button"
        onClick={onBack}
        className="min-h-10 text-left text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
      >
        ← 목록으로 돌아가기
      </button>

      <header className="mt-5 border-b border-[var(--editorial-line)] pb-6">
        <p className="text-[11px] text-[var(--editorial-accent)]">
          {article.eyebrow}
        </p>
        <h1 className="mt-3 text-[34px] font-normal leading-[1.55]">
          {article.title}
        </h1>
        <p className="editorial-copy mt-4 text-xl leading-[1.5]">
          {article.subtitle}
        </p>
      </header>

      {article.quickSummary ? (
        <section className="border-b border-[var(--editorial-line)] py-6">
          <h2 className="text-base">한눈에 읽기</h2>
          <p className="editorial-copy mt-3 max-w-3xl text-sm leading-6 text-[var(--editorial-muted)]">
            {article.quickSummary}
          </p>
        </section>
      ) : null}

      {article.variant === "graph" && (article.learningSteps?.length ?? 0) > 0 ? (
        <section className="border-b border-[var(--editorial-line)] py-6">
          <p className="text-[11px] text-[var(--editorial-accent)]">
            FOUNDATION → UNDERSTAND → BUILD
          </p>
          <div className="mt-4">
            <ContentEntryList
              entries={article.learningSteps ?? []}
              onOpen={onOpenRelated}
            />
          </div>
          <p className="mt-4 text-xs text-[var(--editorial-muted)]">
            각 단계를 선택하면 연결된 학습 자료로 이동합니다.
          </p>
        </section>
      ) : null}

      {article.sections.map((section) => (
        <section
          key={section.id}
          className="border-b border-[var(--editorial-line)] py-6"
        >
          <h2 className="text-base">{section.heading}</h2>
          <p className="editorial-copy mt-3 max-w-3xl text-sm leading-6 text-[var(--editorial-muted)]">
            {section.body}
          </p>
        </section>
      ))}

      {article.codeSample ? (
        <section className="border-b border-[var(--editorial-line)] py-6">
          <p className="text-[11px] text-[var(--editorial-accent)]">
            {article.codeSample.label}
          </p>
          <pre className="mt-4 overflow-x-auto border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5 text-sm leading-6 text-[var(--editorial-ink)]">
            <code>{article.codeSample.code}</code>
          </pre>
        </section>
      ) : null}

      {(article.sourceInfo?.length ?? 0) > 0 ? (
        <section className="border-b border-[var(--editorial-line)] py-6">
          <h2 className="text-base">원문 정보</h2>
          <div className="mt-3 space-y-1 text-sm leading-6 text-[var(--editorial-muted)]">
            {article.sourceInfo?.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>
      ) : null}

      {article.relatedItems.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base">관련 자료</h2>
          <div className="mt-3">
            <ContentEntryList
              entries={article.relatedItems}
              onOpen={onOpenRelated}
            />
          </div>
        </section>
      ) : null}

      <footer className="mt-8 flex flex-col items-start gap-4 border-t border-[var(--editorial-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        {article.officialUrl ? (
          <a
            href={article.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-10 py-2 text-sm text-[var(--editorial-accent)]"
          >
            공식 Docs 살펴보기 →
          </a>
        ) : (
          <span className="text-xs text-[var(--editorial-muted)]">
            원문 연결 준비 중
          </span>
        )}
        {article.nextItemId ? (
          <button
            type="button"
            onClick={() => onOpenRelated(article.nextItemId!)}
            className="min-h-10 py-2 text-sm text-[var(--editorial-ink)] hover:text-[var(--editorial-accent)]"
          >
            {article.actionLabel ?? "이어 읽기 →"}
          </button>
        ) : null}
      </footer>

      {article.prototypeNote ? (
        <p className="mt-4 text-[11px] text-[var(--editorial-muted)]">
          {article.prototypeNote}
        </p>
      ) : null}
    </article>
  )
}
