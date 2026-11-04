'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'

import type { HubData } from '@/lib/cryptopedia-hub'
import { activePathOf } from '@/lib/learner/actions'
import { computeRoute, type RouteStep } from '@/lib/learner/route'
import { readCompletedCases } from '@/lib/learner/store'
import { useLearner } from '@/lib/learner/use-learner'

import { STEP_KIND_LABEL } from './my-path-card'

/* 사이드바 맨 아래 '내 학습 경로' — 컬렉션(체인)과 상관없는 입구.
   진행 중인 경로가 있으면 이름 · 진행률 · 다음 할 것, 없으면 '내 경로 만들기'.
   경로는 자기 체인의 hub 로 계산하므로 체인별로 한 번 불러 둔다. */

const hubCache = new Map<string, Promise<HubData>>()

export function useChainHub(
  chainId: string | null,
  loadHub: (chainId: string) => Promise<HubData>
) {
  const [hub, setHub] = useState<{ chainId: string; data: HubData } | null>(null)
  useEffect(() => {
    if (!chainId) return
    let alive = true
    if (!hubCache.has(chainId)) hubCache.set(chainId, loadHub(chainId))
    hubCache
      .get(chainId)!
      .then((data) => alive && setHub({ chainId, data }))
      .catch(() => hubCache.delete(chainId))
    return () => {
      alive = false
    }
  }, [chainId, loadHub])
  return hub && hub.chainId === chainId ? hub.data : null
}

export function MyPathSidebarCard({
  loadHub,
  active = false,
  onOpenPath,
  onOpenStep,
}: {
  loadHub: (chainId: string) => Promise<HubData>
  /** 지금 내 학습 경로 화면을 보고 있으면 강조 */
  active?: boolean
  onOpenPath: () => void
  onOpenStep: (step: RouteStep) => void
}) {
  const { state } = useLearner()
  const path = state ? activePathOf(state) : null
  const hub = useChainHub(path?.chainId ?? null, loadHub)
  const route = useMemo(
    () => (hub && state && path ? computeRoute(hub, path, state, readCompletedCases(hub)) : null),
    [hub, path, state]
  )

  if (!state) return null
  const frame = `block w-full border px-4 py-3.5 text-left ${active ? 'border-[var(--editorial-accent)] bg-[var(--editorial-hover)]' : 'border-[var(--editorial-line)] bg-[var(--editorial-surface)] hover:border-[var(--editorial-accent)]'}`

  if (!path) {
    return (
      <button type="button" onClick={onOpenPath} className={frame}>
        <span className="block text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
          내 학습 경로
        </span>
        <span className="mt-1.5 flex items-center justify-between gap-2 text-sm text-[var(--editorial-ink)]">
          어디서부터 볼지 정하기 <ArrowRight size={14} />
        </span>
      </button>
    )
  }

  const total = route?.steps.length ?? 0
  const percent = route && total ? Math.round((route.doneCount / total) * 100) : 0
  const next = route?.start ?? null
  return (
    <div className={frame}>
      <button type="button" onClick={onOpenPath} className="block w-full text-left">
        <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
          내 학습 경로
          <span className="font-normal normal-case tracking-normal text-[var(--editorial-muted)]">
            {state.paths.length > 1 ? `경로 ${state.paths.length}개 · ` : ''}전체 보기 →
          </span>
        </span>
        <span className="mt-1.5 block truncate text-sm font-semibold text-[var(--editorial-strong)]">
          {path.name}
        </span>
      </button>
      <div className="mt-2 h-1 bg-[var(--editorial-line)]">
        <div className="h-full bg-[var(--editorial-accent)]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--editorial-muted)]">
        {route ? `${route.doneCount} / ${total} 단계` : '불러오는 중…'}
      </p>
      {next ? (
        <button
          type="button"
          onClick={() => onOpenStep(next)}
          className="mt-3 flex w-full items-center justify-between gap-2 bg-[var(--editorial-accent)] px-3 py-2 text-left text-[13px] font-semibold text-[var(--editorial-on-accent)] hover:brightness-110"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-normal opacity-80">
              다음 · {STEP_KIND_LABEL[next.kind]}
            </span>
            <span className="block truncate">{next.title}</span>
          </span>
          <ArrowRight size={15} className="shrink-0" />
        </button>
      ) : (
        route && <p className="mt-3 text-xs text-[var(--editorial-secondary)]">✓ 모두 마쳤어요</p>
      )}
    </div>
  )
}
