'use client'

import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'

import chainCatalog from '@/public/cryptopedia/chains.json'
import type { HubData } from '@/lib/cryptopedia-hub'
import { activePathOf, removePath, selectPath, setProgress } from '@/lib/learner/actions'
import { computeRoute, type RouteStep } from '@/lib/learner/route'
import { readCompletedCases } from '@/lib/learner/store'
import { ROLES } from '@/lib/learner/tracks'
import { updateLearner, useLearner } from '@/lib/learner/use-learner'

import { HUB_BUTTON_CLASS, HUB_PAGE_CLASS, HubHeader } from './hub-shared'
import { LearningMap, LearningMapLegend, layoutLearningMap } from './learning-map'
import { STEP_KIND_LABEL } from './my-path-card'
import { MyPathOnboarding } from './my-path-onboarding'

/* 아카데미 > 내 학습 경로 (/academy/my-path).
   경로가 없으면 설문, 있으면 다음 할 것 · 학습 지도(개인화) · 순서 목록.
   경로는 저장된 목표 · 완료 기록 · hub 로 매번 계산한다(lib/learner/route.ts). */

const DESCRIPTION =
  '하는 일 · 해본 것 · 하고 싶은 것에 맞춰 학습 지도 위에 순서를 그렸어요. 다음 할 것 하나부터 시작하세요.'

export function MyPathPage({
  data,
  onOpen,
  onOpenScreen,
}: {
  data: HubData
  onOpen: (id: string) => void
  onOpenScreen: (id: 'projects' | 'events' | 'updates') => void
}) {
  const { state, persisted } = useLearner()
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const path = state ? activePathOf(state) : null
  const route = useMemo(
    () => (state && path ? computeRoute(data, path, state, readCompletedCases(data)) : null),
    [data, path, state]
  )
  const mapLayout = useMemo(() => layoutLearningMap(data.concepts), [data.concepts])

  const openStep = (step: RouteStep) =>
    step.kind === 'screen'
      ? onOpenScreen(step.id as 'projects' | 'events' | 'updates')
      : onOpen(step.id)

  if (!state) {
    return (
      <article className={HUB_PAGE_CLASS} aria-busy="true">
        <HubHeader title="내 학습 경로" description={DESCRIPTION} />
      </article>
    )
  }

  if (!path || !route || adding) {
    return (
      <article className={HUB_PAGE_CLASS}>
        <HubHeader
          title="내 학습 경로"
          description="어디서부터 볼지 1분이면 정해 드려요. 답한 내용으로 학습 지도에 시작점과 순서를 표시해요."
        />
        <MyPathOnboarding
          hub={data}
          adding={adding}
          onExit={adding ? () => setAdding(false) : undefined}
          onCreated={() => setAdding(false)}
        />
      </article>
    )
  }

  const total = route.steps.length
  const percent = total ? Math.round((route.doneCount / total) * 100) : 0
  const next = route.start
  const concepts = route.steps.filter((step) => step.kind === 'concept')
  const progressMap = new Map(
    concepts.flatMap((step) => (step.status ? [[step.id, step.status] as const] : []))
  )
  const selected = next?.kind === 'concept' ? next.id : (concepts.at(-1)?.id ?? '')
  const knownCount = route.steps.filter((step) => step.status === 'known').length
  const now = () => new Date().toISOString()

  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader title="내 학습 경로" description={DESCRIPTION} />

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-semibold text-[var(--editorial-strong)]">
            {path.name}
          </h2>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="border border-[var(--editorial-accent)] px-2 py-0.5 text-[var(--editorial-accent)]">
              {path.mode === 'track' ? '처음부터 쌓기' : '목표 이루기'}
            </span>
            <span className="border border-[var(--editorial-line)] px-2 py-0.5 text-[var(--editorial-muted)]">
              {ROLES[path.role].label}
            </span>
            <span className="border border-[var(--editorial-line)] px-2 py-0.5 text-[var(--editorial-muted)]">
              {chainCatalog.items.find((item) => item.id === path.chainId)?.name ?? path.chainId}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="경로 고르기">
          {state.paths.length > 1 &&
            state.paths.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === path.id}
                onClick={() => {
                  setConfirmDelete(false)
                  updateLearner((current) => selectPath(current, item.id))
                }}
                className={`${HUB_BUTTON_CLASS} min-h-9 text-xs ${item.id === path.id ? 'border-[var(--editorial-accent)] text-[var(--editorial-accent)]' : ''}`}
              >
                {item.name}
              </button>
            ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${HUB_BUTTON_CLASS} min-h-9 text-xs`}
          >
            + 새 경로
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false)
                updateLearner((current) => removePath(current, path.id))
              }}
              className={`${HUB_BUTTON_CLASS} min-h-9 border-[var(--editorial-accent)] text-xs text-[var(--editorial-accent)]`}
            >
              이 경로 지우기 (완료 기록은 남아요)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={`${HUB_BUTTON_CLASS} min-h-9 text-xs`}
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {next ? (
        <div className="mt-6 flex flex-col gap-4 border border-[var(--editorial-accent)] bg-[var(--editorial-surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
              다음 할 것 · {route.steps.indexOf(next) + 1}단계 / {total} ·{' '}
              {STEP_KIND_LABEL[next.kind]}
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--editorial-strong)]">
              {next.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--editorial-muted)]">{next.summary}</p>
          </div>
          <button
            type="button"
            onClick={() => openStep(next)}
            className="inline-flex shrink-0 items-center justify-center gap-2 bg-[var(--editorial-accent)] px-5 py-3 text-sm font-semibold text-[var(--editorial-paper)] hover:brightness-110"
          >
            시작하기 <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <p className="mt-6 border border-[var(--editorial-accent)] p-5 text-sm text-[var(--editorial-muted)]">
          이 경로를 모두 마쳤어요. 다른 목표로 새 경로를 만들어 보세요.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--editorial-muted)]">
        <div className="h-1 w-full max-w-[280px] bg-[var(--editorial-line)]">
          <div className="h-full bg-[var(--editorial-accent)]" style={{ width: `${percent}%` }} />
        </div>
        <span className="shrink-0">
          {route.doneCount} / {total} 단계 · 남은 시간 약 {route.minutesLeft}분
        </span>
      </div>
      {!persisted && (
        <p className="mt-3 text-xs text-[var(--editorial-muted)]">
          이 브라우저에 저장할 수 없어요. 새로고침하면 진행 상황이 사라질 수 있어요.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="my-path-order" className="min-w-0 lg:order-2">
          <h3
            id="my-path-order"
            className="text-xs tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            순서 · 개념 → 실습·스킬
          </h3>
          <ol className="mt-3 border border-[var(--editorial-line)]">
            {route.steps.map((step, index) => {
              const isNext = step === next
              return (
                <li
                  key={`${step.kind}-${step.id}`}
                  className={`flex items-start gap-3 border-b border-[var(--editorial-line)] px-4 py-3 last:border-b-0 ${isNext ? 'bg-[var(--editorial-hover)] shadow-[inset_3px_0_0_var(--editorial-accent)]' : ''}`}
                >
                  <span
                    className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center border text-[11px] tabular-nums ${isNext ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)] text-[var(--editorial-paper)]' : 'border-[var(--editorial-line)] text-[var(--editorial-muted)]'}`}
                  >
                    {step.status ? '✓' : index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => openStep(step)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span
                      className={`block text-sm ${step.status ? 'text-[var(--editorial-muted)]' : 'text-[var(--editorial-ink)]'} hover:text-[var(--editorial-accent)]`}
                    >
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--editorial-muted)]">
                      {step.status === 'known'
                        ? '이미 아는 것으로 표시'
                        : step.status === 'done'
                          ? '마침'
                          : step.kind === 'concept'
                            ? step.target
                              ? '목표 개념'
                              : '먼저 알아야 할 개념'
                            : STEP_KIND_LABEL[step.kind]}
                    </span>
                  </button>
                  {step.status && step.kind !== 'case' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateLearner((current) =>
                          setProgress(
                            current,
                            step.id,
                            step.status === 'known' ? 'todo' : null,
                            now()
                          )
                        )
                      }
                      className="shrink-0 text-[11px] text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
                    >
                      {step.status === 'known' ? '아직 몰라요' : '취소'}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          {knownCount > 0 && (
            <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">
              해본 것으로 {knownCount}개를 건너뛰었어요. 아직 모르는 개념은 ‘아직 몰라요’를
              누르세요.
            </p>
          )}
        </section>

        <section aria-labelledby="my-path-map" className="min-w-0 lg:order-1">
          <h3 id="my-path-map" className="text-xs tracking-[0.14em] text-[var(--editorial-muted)]">
            학습 지도 · 개념을 누르면 열려요
          </h3>
          <div className="-mt-3">
            <LearningMap
              layout={mapLayout}
              selected={selected}
              route={concepts.map((step) => step.id)}
              progress={progressMap}
              onSelect={onOpen}
            />
          </div>
          <LearningMapLegend route personal />
        </section>
      </div>
    </article>
  )
}
