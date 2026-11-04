'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'

import chainCatalog from '@/public/cryptopedia/chains.json'
import type { HubData } from '@/lib/cryptopedia-hub'
import { activePathOf, removePath, selectPath, setProgress } from '@/lib/learner/actions'
import { computeRoute, type RouteStep } from '@/lib/learner/route'
import { readCompletedCases, type LearnerPath, type LearnerState } from '@/lib/learner/store'
import { ROLES } from '@/lib/learner/tracks'
import { updateLearner, useLearner } from '@/lib/learner/use-learner'

import { useEditorialChain } from './editorial-chain-provider'
import { HUB_BUTTON_CLASS, HUB_PAGE_CLASS, HubHeader } from './hub-shared'
import { LearningMap, LearningMapLegend, layoutLearningMap } from './learning-map'
import { STEP_KIND_LABEL } from './my-path-card'
import { MyPathOnboarding } from './my-path-onboarding'
import { useChainHub } from './my-path-sidebar'

/* 내 학습 경로 (/my-path) — 컬렉션(체인)과 상관없이 하나. 사이드바 아래 카드에서 들어온다.
   경로가 없으면 설문, 있으면 경로 카드 캐러셀 → 다음 할 것 · 학습 지도(개인화) · 순서 목록.
   카드를 넘기면 그 경로가 '지금 보는 경로'가 되고 아래 지도·목록이 따라 바뀐다.
   경로는 자기 체인의 hub 와 완료 기록으로 매번 계산한다(lib/learner/route.ts). */

const DESCRIPTION =
  '하는 일 · 해본 것 · 하고 싶은 것에 맞춰 학습 지도 위에 순서를 그렸어요. 경로가 여러 개면 카드를 넘겨 보세요.'

const chainName = (id: string) => chainCatalog.items.find((item) => item.id === id)?.name ?? id

export function MyPathPage({
  loadHub,
  onOpen,
  onOpenScreen,
}: {
  loadHub: (chainId: string) => Promise<HubData>
  onOpen: (id: string) => void
  onOpenScreen: (id: 'projects' | 'events' | 'updates') => void
}) {
  const { state, persisted } = useLearner()
  const { activeChain } = useEditorialChain()
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const path = state ? activePathOf(state) : null
  const data = useChainHub(path?.chainId ?? activeChain.id, loadHub)
  const route = useMemo(
    () =>
      data && state && path ? computeRoute(data, path, state, readCompletedCases(data)) : null,
    [data, path, state]
  )
  const mapLayout = useMemo(() => (data ? layoutLearningMap(data.concepts) : null), [data])

  const openStep = (step: RouteStep) =>
    step.kind === 'screen'
      ? onOpenScreen(step.id as 'projects' | 'events' | 'updates')
      : onOpen(step.id)

  if (!state || !data || !mapLayout) {
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

      <PathCarousel
        state={state}
        activeId={path.id}
        loadHub={loadHub}
        onSelect={(id) => {
          setConfirmDelete(false)
          updateLearner((current) => selectPath(current, id))
        }}
        onAdd={() => setAdding(true)}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 break-words text-xl font-semibold text-[var(--editorial-strong)]">
          {path.name}
        </h2>
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
                    className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center border text-[11px] tabular-nums ${isNext ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)] text-[var(--editorial-paper)]' : step.status ? 'border-transparent bg-[var(--editorial-secondary-soft)] text-[var(--editorial-secondary)]' : 'border-[var(--editorial-line)] text-[var(--editorial-muted)]'}`}
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

/* 경로 카드 캐러셀 — 한 번에 카드 하나가 가운데 오고 양옆 카드가 살짝 보인다.
   넘겨서 멈춘 카드(가운데에 가장 가까운 카드)가 지금 보는 경로가 되고, 아래 지도·목록이 따라 바뀐다.
   화살표 · 카드 클릭으로도 고를 수 있고, 고른 카드는 가운데로 옮겨진다. */
function PathCarousel({
  state,
  activeId,
  loadHub,
  onSelect,
  onAdd,
}: {
  state: LearnerState
  activeId: string
  loadHub: (chainId: string) => Promise<HubData>
  onSelect: (id: string) => void
  onAdd: () => void
}) {
  const track = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paths = state.paths
  const index = paths.findIndex((item) => item.id === activeId)

  const cardOf = (id: string) => track.current?.querySelector<HTMLElement>(`[data-path="${id}"]`)
  useEffect(() => {
    const el = cardOf(activeId)
    const row = track.current
    if (el && row)
      row.scrollTo({
        left: el.offsetLeft - (row.clientWidth - el.clientWidth) / 2,
        behavior: 'smooth',
      })
  }, [activeId])
  useEffect(() => () => void (settle.current && clearTimeout(settle.current)), [])

  // 손으로 넘긴 뒤 멈추면, 가운데에 가장 가까운 카드를 고른다
  const onScroll = () => {
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const el = track.current
      if (!el) return
      let best: { id: string; gap: number } | null = null
      for (const card of el.querySelectorAll<HTMLElement>('[data-path]')) {
        const gap = Math.abs(
          card.offsetLeft + card.clientWidth / 2 - (el.scrollLeft + el.clientWidth / 2)
        )
        if (!best || gap < best.gap) best = { id: card.dataset.path!, gap }
      }
      if (best && best.id !== activeId) onSelect(best.id)
    }, 140)
  }

  return (
    <section aria-label="내 경로 카드" className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs tracking-[0.14em] text-[var(--editorial-muted)]">
          경로 {paths.length}개{paths.length > 1 && ` · ${index + 1}번째`}
        </p>
        {paths.length > 1 && (
          <div className="flex gap-1">
            {[
              [index - 1, '이전 경로', ArrowLeft],
              [index + 1, '다음 경로', ArrowRight],
            ].map(([target, label, Icon]) => {
              const to = paths[target as number]
              const IconTag = Icon as typeof ArrowLeft
              return (
                <button
                  key={label as string}
                  type="button"
                  aria-label={label as string}
                  disabled={!to}
                  onClick={() => to && onSelect(to.id)}
                  className="flex h-8 w-8 items-center justify-center border border-[var(--editorial-line)] text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)] disabled:opacity-30"
                >
                  <IconTag size={15} />
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div
        ref={track}
        onScroll={onScroll}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]"
      >
        {paths.map((item) => (
          <PathCard
            key={item.id}
            path={item}
            state={state}
            active={item.id === activeId}
            loadHub={loadHub}
            onSelect={() => onSelect(item.id)}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex w-[160px] shrink-0 snap-center flex-col items-center justify-center gap-2 border border-dashed border-[var(--editorial-line)] text-sm text-[var(--editorial-muted)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
        >
          <Plus size={18} /> 새 경로
        </button>
      </div>
    </section>
  )
}

function PathCard({
  path,
  state,
  active,
  loadHub,
  onSelect,
}: {
  path: LearnerPath
  state: LearnerState
  active: boolean
  loadHub: (chainId: string) => Promise<HubData>
  onSelect: () => void
}) {
  const hub = useChainHub(path.chainId, loadHub)
  const route = useMemo(
    () => (hub ? computeRoute(hub, path, state, readCompletedCases(hub)) : null),
    [hub, path, state]
  )
  const total = route?.steps.length ?? 0
  const percent = route && total ? Math.round((route.doneCount / total) * 100) : 0
  return (
    <button
      type="button"
      data-path={path.id}
      aria-pressed={active}
      onClick={onSelect}
      className={`flex w-[86%] max-w-[620px] shrink-0 snap-center flex-col border p-6 text-left transition-[opacity,border-color,background-color] sm:w-[72%] ${active ? 'border-[var(--editorial-accent)] bg-[var(--editorial-hover)] shadow-[inset_0_3px_0_var(--editorial-accent)]' : 'border-[var(--editorial-line)] bg-[var(--editorial-surface)] opacity-60 hover:border-[var(--editorial-accent)] hover:opacity-100'}`}
    >
      <span className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="border border-[var(--editorial-line)] px-1.5 py-0.5 text-[var(--editorial-muted)]">
          {chainName(path.chainId)}
        </span>
        <span className="border border-[var(--editorial-line)] px-1.5 py-0.5 text-[var(--editorial-muted)]">
          {path.mode === 'track' ? '처음부터 쌓기' : '목표 이루기'}
        </span>
        <span className="border border-[var(--editorial-line)] px-1.5 py-0.5 text-[var(--editorial-muted)]">
          {ROLES[path.role].label}
        </span>
      </span>
      <span className="mt-3 line-clamp-2 min-h-[3rem] text-[17px] font-semibold leading-6 text-[var(--editorial-strong)]">
        {path.name}
      </span>
      <span className="mt-3 h-1 bg-[var(--editorial-line)]">
        <span
          className="block h-full bg-[var(--editorial-accent)]"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="mt-2 text-xs text-[var(--editorial-muted)]">
        {route
          ? route.start
            ? `${route.doneCount} / ${total} 단계 · 다음: ${route.start.title}`
            : '✓ 모두 마쳤어요'
          : '불러오는 중…'}
      </span>
    </button>
  )
}
