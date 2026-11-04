'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'

import type { HubData } from '@/lib/cryptopedia-hub'
import { activePathOf } from '@/lib/learner/actions'
import { computeRoute, type RouteStep } from '@/lib/learner/route'
import { readCompletedCases } from '@/lib/learner/store'
import { useLearner } from '@/lib/learner/use-learner'

import { STEP_KIND_LABEL } from './my-path-card'

/* 진행 중인 내 학습 경로 — 블록체인 지식 섹션 어디서든 화면 아래에 붙는 띠.
   경로가 없거나 모두 마쳤으면, 또는 이번 방문에 닫았으면 숨긴다.
   hub 는 화면마다 불러오지 않으므로(LIVE 화면 등) 띠가 체인별로 한 번 불러 둔다. */

const BANNER_HEIGHT = 64
const DISMISS_KEY = 'cryptopedia-learner:banner-closed'
const hubCache = new Map<string, Promise<HubData>>()

export function MyPathBanner({
  chainId,
  loadHub,
  hidden = false,
  onOpen,
  onOpenStep,
}: {
  chainId: string
  loadHub: () => Promise<HubData>
  /** 내 학습 경로 페이지처럼 같은 내용을 이미 보여 주는 화면에서는 숨긴다 */
  hidden?: boolean
  onOpen: (id: string) => void
  onOpenStep: (step: RouteStep) => void
}) {
  const { state } = useLearner()
  const [hub, setHub] = useState<HubData | null>(null)
  const [closed, setClosed] = useState(true)

  useEffect(() => {
    try {
      setClosed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setClosed(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    if (!hubCache.has(chainId)) hubCache.set(chainId, loadHub())
    hubCache
      .get(chainId)!
      .then((data) => alive && setHub(data))
      .catch(() => hubCache.delete(chainId))
    return () => {
      alive = false
    }
  }, [chainId, loadHub])

  const path = state ? activePathOf(state) : null
  const route = useMemo(
    () => (hub && state && path ? computeRoute(hub, path, state, readCompletedCases(hub)) : null),
    [hub, path, state]
  )
  const visible = !hidden && !closed && !!route?.start

  // 띠가 본문 마지막 줄(푸터)을 가리지 않게 그 높이만큼 아래 여백을 준다
  useEffect(() => {
    if (!visible) return
    const previous = document.body.style.paddingBottom
    document.body.style.paddingBottom = `${BANNER_HEIGHT}px`
    return () => {
      document.body.style.paddingBottom = previous
    }
  }, [visible])

  if (!visible || !route || !path) return null
  const next = route.start!
  const total = route.steps.length
  const percent = total ? Math.round((route.doneCount / total) * 100) : 0

  return (
    <aside
      aria-label="진행 중인 내 학습 경로"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--editorial-line)] bg-[var(--editorial-sidebar)]/95 backdrop-blur lg:left-[260px]"
      style={{ height: BANNER_HEIGHT }}
    >
      {/* 진행률은 띠 위 가장자리에 얇게 */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[var(--editorial-line)]">
        <div className="h-full bg-[var(--editorial-accent)]" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex h-full items-center gap-3 px-4 sm:gap-5 sm:px-8 lg:px-[52px]">
        <button
          type="button"
          onClick={() => onOpen('my-path')}
          className="hidden min-w-0 shrink text-left md:block"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--editorial-accent)]">
            내 학습 경로 · {route.doneCount}/{total}
          </span>
          <span className="block max-w-[22ch] truncate text-sm text-[var(--editorial-ink)] hover:text-[var(--editorial-accent)]">
            {path.name}
          </span>
        </button>
        <span aria-hidden="true" className="hidden h-8 w-px bg-[var(--editorial-line)] md:block" />
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] text-[var(--editorial-muted)]">
            다음 · {route.steps.indexOf(next) + 1}단계 · {STEP_KIND_LABEL[next.kind]}
          </span>
          <span className="block truncate text-sm font-semibold text-[var(--editorial-strong)]">
            {next.title}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenStep(next)}
          className="inline-flex shrink-0 items-center gap-1.5 bg-[var(--editorial-accent)] px-4 py-2 text-sm font-semibold text-[var(--editorial-paper)] hover:brightness-110"
        >
          이어서 하기 <ArrowRight size={15} />
        </button>
        <button
          type="button"
          aria-label="이번 방문 동안 띠 닫기"
          onClick={() => {
            setClosed(true)
            try {
              sessionStorage.setItem(DISMISS_KEY, '1')
            } catch {
              /* 닫기는 이 화면에서만 유지 */
            }
          }}
          className="shrink-0 p-1 text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
        >
          <X size={16} />
        </button>
      </div>
    </aside>
  )
}
