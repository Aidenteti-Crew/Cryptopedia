import type { ArticleDetail } from '@/lib/cryptopedia-types'

import { ContentEntryList } from './content-entry-list'

interface ArticleReaderProps {
  article: ArticleDetail

  onOpenRelated: (id: string) => void
}

export function ArticleReader({
  article,

  onOpenRelated,
}: ArticleReaderProps) {
  /* 학습 문서 — 페이지 폭은 제한하지 않고 긴 문단만 800px로 제한한다.
     본문 섹션 간격은 44px로 통일하고, 구분선이 낀 관련 자료는 선 위·아래를 합쳐 같은 44px 안에 둔다.
     구분선은 머리말 아래·관련 자료 위 두 곳만 쓴다.
     위계: 제목(40) > 소제목(22) > 본문(16 / 1.7) > 메타(13) */
  return (
    <article className="px-5 pb-10 pt-4 sm:px-8 sm:pb-12 lg:px-[52px] lg:pb-[64px]">
      <header className="border-b border-[var(--editorial-line)] pb-8">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--editorial-accent)]">
          {article.eyebrow}
        </p>
        <h1 className="editorial-detail-title mt-4 text-[34px] font-medium leading-[1.3] tracking-[-0.5px] text-[var(--editorial-strong)] sm:text-[40px]">
          {article.title}
        </h1>
        <p className="editorial-copy mt-5 text-lg leading-[1.6] text-[var(--editorial-ink)]">
          {article.subtitle}
        </p>
      </header>

      {article.quickSummary ? (
        <section className="mt-11 border-l-2 border-[var(--editorial-mark)] pl-5">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] text-[var(--editorial-accent)]">
            한눈에 읽기
          </h2>
          <p className="editorial-copy max-w-[800px] mt-3 text-base leading-[1.7] text-[var(--editorial-ink)]">
            {article.quickSummary}
          </p>
        </section>
      ) : null}

      {article.variant === 'graph' && (article.learningSteps?.length ?? 0) > 0 ? (
        <section className="mt-11">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--editorial-accent)]">
            FOUNDATION → UNDERSTAND → BUILD
          </p>
          <div className="mt-4">
            <ContentEntryList entries={article.learningSteps ?? []} onOpen={onOpenRelated} />
          </div>
          <p className="mt-4 text-[13px] text-[var(--editorial-muted)]">
            각 단계를 선택하면 연결된 학습 자료로 이동합니다.
          </p>
        </section>
      ) : null}

      {article.sections.map((section) => (
        <section key={section.id} className="mt-11">
          <h2 className="text-[22px] font-medium leading-snug text-[var(--editorial-strong)]">
            {section.heading}
          </h2>
          <p className="editorial-copy max-w-[800px] mt-4 text-base leading-[1.7] text-[var(--editorial-ink)]">
            {section.body}
          </p>
        </section>
      ))}

      {article.codeSample ? (
        <section className="mt-11">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--editorial-accent)]">
            {article.codeSample.label}
          </p>
          <pre className="mt-4 overflow-x-auto border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5 text-sm leading-6 text-[var(--editorial-ink)]">
            <code>{article.codeSample.code}</code>
          </pre>
        </section>
      ) : null}

      {(article.sourceInfo?.length ?? 0) > 0 ? (
        <section className="mt-11">
          <h2 className="text-[13px] font-semibold text-[var(--editorial-muted)]">원문 정보</h2>
          <div className="mt-2 space-y-1 text-[13px] leading-6 text-[var(--editorial-muted)]">
            {article.sourceInfo?.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>
      ) : null}

      {article.relatedItems.length > 0 ? (
        <section className="mt-5 border-t border-[var(--editorial-line)] pt-6">
          <h2 className="text-[22px] font-medium leading-snug text-[var(--editorial-strong)]">관련 자료</h2>
          <div className="mt-4">
            <ContentEntryList entries={article.relatedItems} onOpen={onOpenRelated} />
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <span className="text-xs text-[var(--editorial-muted)]">원문 연결 준비 중</span>
        )}
        {article.nextItemId ? (
          <button
            type="button"
            onClick={() => onOpenRelated(article.nextItemId!)}
            className="min-h-10 py-2 text-sm text-[var(--editorial-ink)] hover:text-[var(--editorial-accent)]"
          >
            {article.actionLabel ?? '이어 읽기 →'}
          </button>
        ) : null}
      </div>

      {article.prototypeNote ? (
        <p className="mt-4 text-[11px] text-[var(--editorial-muted)]">{article.prototypeNote}</p>
      ) : null}
    </article>
  )
}
