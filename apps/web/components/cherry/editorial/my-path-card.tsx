'use client'

import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'

import type { HubData } from '@/lib/cryptopedia-hub'
import { activePathOf } from '@/lib/learner/actions'
import { computeRoute, type RouteStep } from '@/lib/learner/route'
import { readCompletedCases } from '@/lib/learner/store'
import { ROLES } from '@/lib/learner/tracks'
import { useLearner } from '@/lib/learner/use-learner'

/* 지식 홈 캐러셀 옆 칸 — 진행 중인 경로가 있으면 '이어서 하기', 없으면 '내 경로 만들기'.
   기록은 브라우저에서 읽으므로 첫 화면(서버 렌더)에서는 같은 크기의 빈 칸만 그린다. */

export const STEP_KIND_LABEL: Record<RouteStep['kind'], string> = {
  concept: '개념',
  case: '실습',
  skill: '스킬',
  screen: 'LIVE',
}

const CARD_CLASS =
  'flex min-w-0 flex-col border border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-7 py-8 sm:px-9 lg:h-[600px]'

export function MyPathCard({
  hub,
  onOpen,
  onOpenStep,
}: {
  hub: HubData
  /** 허브 항목(내 경로 등)을 연다 */
  onOpen: (id: string) => void
  /** 경로 단계(개념·실습·스킬·LIVE 화면)를 연다 */
  onOpenStep: (step: RouteStep) => void
}) {
  const { state } = useLearner()
  const path = state ? activePathOf(state) : null
  const route = useMemo(
    () => (state && path ? computeRoute(hub, path, state, readCompletedCases(hub)) : null),
    [hub, path, state]
  )

  if (!state) return <section aria-busy="true" className={CARD_CLASS} />

  if (!path || !route) {
    return (
      <section aria-labelledby="my-path-card-title" className={CARD_CLASS}>
        <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
          My learning path
        </p>
        <h2
          id="my-path-card-title"
          className="mt-5 text-[26px] font-semibold leading-snug text-[var(--editorial-strong)]"
        >
          어디서부터 볼지,
          <br />
          1분이면 정해 드려요
        </h2>
        <p className="mt-4 max-w-[38ch] text-sm leading-7 text-[var(--editorial-muted)]">
          하는 일 · 해본 것 · 하고 싶은 것을 알려 주시면 학습 지도에서 시작점과 순서를 표시해
          드려요.
        </p>
        <button
          type="button"
          onClick={() => onOpen('my-path')}
          className="mt-auto inline-flex w-fit items-center gap-2 bg-[var(--editorial-accent)] px-5 py-3 text-sm font-semibold text-[var(--editorial-paper)] hover:brightness-110"
        >
          내 경로 만들기 <ArrowRight size={16} />
        </button>
      </section>
    )
  }

  const total = route.steps.length
  const percent = total ? Math.round((route.doneCount / total) * 100) : 0
  const next = route.start
  const upcoming = route.steps.filter((step) => !step.status && step !== next).slice(0, 3)
  return (
    <section aria-labelledby="my-path-card-title" className={CARD_CLASS}>
      <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
        이어서 하기
      </p>
      <h2
        id="my-path-card-title"
        className="mt-4 break-words text-[24px] font-semibold leading-snug text-[var(--editorial-strong)]"
      >
        {path.name}
      </h2>
      <p className="mt-2 text-xs text-[var(--editorial-muted)]">
        {path.mode === 'track' ? '처음부터 쌓기' : '목표 이루기'} · {ROLES[path.role].label}
        {state.paths.length > 1 && ` · 경로 ${state.paths.length}개`}
      </p>

      <div className="mt-6">
        <div className="h-1 bg-[var(--editorial-line)]">
          <div className="h-full bg-[var(--editorial-accent)]" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--editorial-muted)]">
          {route.doneCount} / {total} 단계 · 남은 시간 약 {route.minutesLeft}분
        </p>
      </div>

      {next ? (
        <div className="mt-6 border border-[var(--editorial-accent)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
            다음 할 것 · {route.steps.indexOf(next) + 1}단계 · {STEP_KIND_LABEL[next.kind]}
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--editorial-strong)]">{next.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--editorial-muted)]">
            {next.summary}
          </p>
          <button
            type="button"
            onClick={() => onOpenStep(next)}
            className="mt-4 inline-flex items-center gap-2 bg-[var(--editorial-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--editorial-paper)] hover:brightness-110"
          >
            시작하기 <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <p className="mt-6 border border-[var(--editorial-line)] p-5 text-sm text-[var(--editorial-muted)]">
          이 경로를 모두 마쳤어요. 다른 목표로 새 경로를 만들어 보세요.
        </p>
      )}

      {upcoming.length > 0 && (
        <ol className="mt-6 hidden space-y-2 text-sm text-[var(--editorial-muted)] lg:block">
          {upcoming.map((step) => (
            <li key={step.id} className="flex items-baseline gap-3">
              <span className="w-5 shrink-0 text-xs tabular-nums text-[var(--editorial-accent)]">
                {route.steps.indexOf(step) + 1}
              </span>
              <span className="min-w-0 truncate">{step.title}</span>
              <span className="ml-auto shrink-0 text-[10px]">{STEP_KIND_LABEL[step.kind]}</span>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() => onOpen('my-path')}
        className="mt-auto inline-flex w-fit items-center gap-2 pt-6 text-sm text-[var(--editorial-accent)] hover:underline"
      >
        내 경로 전체 보기 <ArrowRight size={14} />
      </button>
    </section>
  )
}
