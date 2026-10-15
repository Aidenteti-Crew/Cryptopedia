'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Bot, Check, Download } from 'lucide-react'
import { InventoryCard } from '../kaas-workshop-panel'

import { asWorkshopItem, buildCaseBundle, type HubCase, type HubData } from '@/lib/cryptopedia-hub'
import {
  HUB_BUTTON_CLASS,
  HUB_PAGE_CLASS,
  HubHeader,
  RelatedLinks,
  ScopeBadge,
  SourceList,
  downloadMarkdown,
} from './hub-shared'

export function CaseStudyPage({
  study,
  data,

  onOpen,
}: {
  study: HubCase
  data: HubData

  onOpen: (id: string) => void
}) {
  const [mode, setMode] = useState<'learn' | 'agent'>('learn')
  const [selected, setSelected] = useState(study.skillIds)
  const [done, setDone] = useState<number[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [notice, setNotice] = useState('')
  const storageKey = `cryptopedia-study:${study.id}`
  const inventory = study.skillIds.flatMap((id) => {
    const skill = data.skills.find((item) => item.id === id)
    return skill ? [asWorkshopItem(skill)] : []
  })

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      if (Array.isArray(saved))
        setDone(
          saved.filter(
            (value): value is number =>
              Number.isInteger(value) && value >= 0 && value < study.checks.length
          )
        )
    } catch {
      /* Learning progress is optional when local storage is unavailable. */
    }
    setHydrated(true)
  }, [storageKey, study.checks.length])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(done))
    } catch {
      /* Keep in-memory progress. */
    }
  }, [done, hydrated, storageKey])

  const toggleSkill = (id: string) => {
    setNotice('')
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader title={study.title} description={study.summary}>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ScopeBadge scope={study.scope} />
          <span className="text-xs text-[var(--editorial-muted)]">
            {study.level === 'BEGINNER' ? '입문' : '중급'} · 예상 {study.minutes}분
          </span>
        </div>
        <p className="mt-4 text-sm leading-7">완성할 결과물: {study.outcome}</p>
      </HubHeader>

      <div
        className="mt-6 flex flex-wrap gap-3"
        role="tablist"
        aria-label="실습 이용 방식"
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next =
            event.key === 'Home'
              ? 'learn'
              : event.key === 'End'
                ? 'agent'
                : mode === 'learn'
                  ? 'agent'
                  : 'learn'
          setMode(next)
          document.getElementById(`${next}-tab-${study.id}`)?.focus()
        }}
      >
        <button
          type="button"
          role="tab"
          id={`learn-tab-${study.id}`}
          aria-controls={`study-panel-${study.id}`}
          aria-selected={mode === 'learn'}
          tabIndex={mode === 'learn' ? 0 : -1}
          onClick={() => setMode('learn')}
          className={`${HUB_BUTTON_CLASS} ${mode === 'learn' ? 'border-[var(--editorial-accent)] text-[var(--editorial-accent)]' : ''}`}
        >
          <BookOpen size={16} />
          학습하기
        </button>
        <button
          type="button"
          role="tab"
          id={`agent-tab-${study.id}`}
          aria-controls={`study-panel-${study.id}`}
          aria-selected={mode === 'agent'}
          tabIndex={mode === 'agent' ? 0 : -1}
          onClick={() => setMode('agent')}
          className={`${HUB_BUTTON_CLASS} ${mode === 'agent' ? 'border-[var(--editorial-accent)] text-[var(--editorial-accent)]' : ''}`}
        >
          <Bot size={16} />
          에이전트용 묶음 받기
        </button>
      </div>

      <section
        id={`study-panel-${study.id}`}
        role="tabpanel"
        aria-labelledby={`${mode}-tab-${study.id}`}
        className="mt-7"
      >
        {mode === 'learn' ? (
          <ol className="space-y-5">
            {study.steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5"
              >
                <p className="text-[11px] text-[var(--editorial-accent)]">
                  STEP {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-3 text-lg">{step.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">{step.body}</p>
                <RelatedLinks
                  title="먼저 이해할 개념"
                  ids={step.conceptIds}
                  data={data}
                  onOpen={onOpen}
                />
                <RelatedLinks
                  title="이 단계의 참고 자료"
                  ids={step.resourceIds}
                  data={data}
                  onOpen={onOpen}
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
            <div>
              <h2 className="text-lg">이 케이스에 필요한 카드</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--editorial-muted)]">
                지식·스킬·MCP 안내를 선택해 하나의 작업 지침으로 받으세요.
              </p>
              <div className="mt-4 space-y-3">
                {inventory.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    appearance="editorial"
                    selected={selected.includes(item.id)}
                    onToggle={() => toggleSkill(item.id)}
                    onInspect={() => onOpen(item.id)}
                  />
                ))}
              </div>
            </div>
            <aside className="h-fit rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5">
              <p className="text-[11px] text-[var(--editorial-accent)]">YOUR KNOWLEDGE BUNDLE</p>
              <h3 className="mt-3 text-xl">{selected.length}개의 카드</h3>
              <ul className="mt-4 space-y-2 text-xs leading-6 text-[var(--editorial-muted)]">
                <li>목표와 학습 순서</li>
                <li>선택한 작업 지침과 입력·결과물</li>
                <li>공식 출처와 완료 체크리스트</li>
              </ul>
              <button
                type="button"
                disabled={!selected.length}
                onClick={() => {
                  downloadMarkdown(`${study.id}-bundle.md`, buildCaseBundle(study, selected, data))
                  setNotice(
                    '묶음 다운로드를 요청했습니다. 파일을 에이전트의 컨텍스트에 첨부해 사용하세요.'
                  )
                }}
                className={`${HUB_BUTTON_CLASS} mt-5 w-full`}
              >
                <Download size={16} />
                묶음 다운로드
              </button>
              <p role="status" className="mt-3 text-xs leading-6 text-[var(--editorial-accent)]">
                {notice}
              </p>
              <p className="mt-4 text-xs leading-6 text-[var(--editorial-muted)]">
                다운로드는 에이전트의 원격 설치나 실행을 수행하지 않습니다. MCP 연결 방법은 묶음의
                지침에서 확인하세요.
              </p>
            </aside>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-[var(--editorial-line)] p-5">
        <h2 className="flex items-center gap-2 text-base">
          <Check size={16} />
          완료 체크리스트{' '}
          <span className="ml-auto text-xs text-[var(--editorial-muted)]">
            {done.length} / {study.checks.length}
          </span>
        </h2>
        <p className="mt-2 text-xs text-[var(--editorial-muted)]">
          직접 확인한 항목을 표시하세요. 진행 상태는 이 브라우저에 저장됩니다.
        </p>
        <div className="mt-4 space-y-3">
          {study.checks.map((check, index) => (
            <label key={check} className="flex cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                checked={done.includes(index)}
                onChange={() =>
                  setDone((current) =>
                    current.includes(index)
                      ? current.filter((item) => item !== index)
                      : [...current, index]
                  )
                }
                className="mt-1 h-4 w-4 accent-[var(--editorial-accent)]"
              />
              {check}
            </label>
          ))}
        </div>
      </section>
      <RelatedLinks
        title="사용할 프로젝트·도구"
        ids={study.projectIds}
        data={data}
        onOpen={onOpen}
      />
      <SourceList ids={study.sourceIds} data={data} />
    </article>
  )
}
