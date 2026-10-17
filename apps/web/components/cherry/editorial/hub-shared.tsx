import type { ReactNode } from 'react'

import { findHubItem, scopeLabel, type ContentScope, type HubData } from '@/lib/cryptopedia-hub'

export const HUB_PAGE_CLASS = 'px-5 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]'
export const HUB_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-4 py-2 text-sm text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)] disabled:cursor-not-allowed disabled:opacity-40'

export function HubHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="border-b border-[var(--editorial-line)] pb-7">
      <h1 className="editorial-detail-title text-[30px] leading-snug sm:text-[38px]">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--editorial-muted)]">
        {description}
      </p>
      {children}
    </header>
  )
}

export function ScopeBadge({ scope }: { scope: ContentScope }) {
  return (
    <span className="inline-flex rounded border border-[var(--editorial-line)] px-2 py-1 text-[10px] text-[var(--editorial-accent)]">
      {scopeLabel(scope)}
    </span>
  )
}

const ORIGIN_LABEL = {
  OFFICIAL: '공식',
  STANDARD: '공통 표준·기술 문서',
  COMMUNITY: '커뮤니티',
  CURATED: '큐레이션',
}
const MATERIAL_LABEL = {
  DOCS: '공식 문서',
  ACADEMY: '공식 강의',
  ACP: '공식 제안',
  TOOL: '공식 도구',
  STANDARD: '표준 문서',
}
export function SourceList({ ids, data }: { ids: string[]; data: HubData }) {
  const sources = data.sources.filter((source) => ids.includes(source.id))
  return (
    <section className="mt-8 border-t border-[var(--editorial-line)] pt-5">
      <h2 className="text-base">출처</h2>
      <p className="mt-2 text-xs leading-6 text-[var(--editorial-muted)]">
        원문은 각 작성 주체가 제공하며, 학습 순서와 연결 설명은 Cryptopedia가 구성한 데모입니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={HUB_BUTTON_CLASS}
          >
            <span className="text-[10px] text-[var(--editorial-muted)]">
              {ORIGIN_LABEL[source.origin]}
            </span>
            {source.name} ↗
            {source.materialType && (
              <span className="text-[10px] text-[var(--editorial-muted)]">
                {MATERIAL_LABEL[source.materialType]}
              </span>
            )}
            {source.checkedAt && (
              <span className="text-[10px] text-[var(--editorial-muted)]">
                확인 {source.checkedAt}
              </span>
            )}
            {source.reviewStatus === 'COMPARE_REQUIRED' && (
              <span className="text-[10px] font-semibold text-amber-300">내용 대조 필요</span>
            )}
          </a>
        ))}
      </div>
      {sources.some((source) => source.reviewNote) && (
        <ul className="mt-3 space-y-1 text-xs leading-6 text-amber-200/80">
          {sources.flatMap((source) =>
            source.reviewNote ? [<li key={source.id}>{source.reviewNote}</li>] : []
          )}
        </ul>
      )}
    </section>
  )
}

export function RelatedLinks({
  title,
  ids,
  data,
  onOpen,
}: {
  title: string
  ids: string[]
  data: HubData
  onOpen: (id: string) => void
}) {
  const items = ids.flatMap((id) => {
    const item = findHubItem(data, id)
    return item ? [item] : []
  })
  if (!items.length) return null
  return (
    <section className="mt-7">
      <h2 className="text-base">{title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="rounded-lg border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-4 text-left hover:border-[var(--editorial-accent)]"
          >
            <ScopeBadge scope={item.scope} />
            <span className="mt-3 block text-sm">{item.title} →</span>
            <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">
              {item.summary}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* 스킬이 담고 있는 개념을 칩으로 보여주고, 누르면 같은 핵심 개념 페이지로 간다 */
export function ConceptChips({
  ids,
  data,
  onOpen,
  className = '',
}: {
  ids: string[]
  data: HubData
  onOpen: (id: string) => void
  className?: string
}) {
  const concepts = data.concepts.filter((concept) => ids.includes(concept.id))
  if (!concepts.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] text-[var(--editorial-muted)]">포함 개념</span>
      {concepts.map((concept) => (
        <button
          key={concept.id}
          type="button"
          onClick={() => onOpen(concept.id)}
          className="rounded-full border border-[var(--editorial-line)] px-2.5 py-1 text-[11px] text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
        >
          {concept.title}
        </button>
      ))}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="mt-6 block">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-lg border border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-4 text-sm text-[var(--editorial-ink)] placeholder:text-[var(--editorial-muted)]"
      />
    </label>
  )
}

export function downloadMarkdown(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Keep the URL alive while the browser starts the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
