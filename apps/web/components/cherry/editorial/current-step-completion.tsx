'use client'

import { useMemo } from 'react'
import { Check } from 'lucide-react'

import type { HubData } from '@/lib/cryptopedia-hub'
import { activePathOf, setProgress } from '@/lib/learner/actions'
import { computeRoute, type RouteStep } from '@/lib/learner/route'
import { readCompletedCases } from '@/lib/learner/store'
import { updateLearner, useLearner } from '@/lib/learner/use-learner'

import { useChainHub } from './my-path-sidebar'

type CurrentView = { kind: 'screen' | 'article' | 'book'; id: string }

export function isCompletableCurrentStep(
  step: RouteStep | null,
  view: CurrentView,
  pathChainId: string,
  activeChainId: string
): boolean {
  if (!step || step.status || pathChainId !== activeChainId || step.id !== view.id) return false
  return (step.kind === 'screen' && view.kind === 'screen') ||
    (step.kind === 'skill' && view.kind === 'article')
}

export function CurrentStepCompletion({
  view,
  activeChainId,
  loadHub,
}: {
  view: CurrentView
  activeChainId: string
  loadHub: (chainId: string) => Promise<HubData>
}) {
  const { state } = useLearner()
  const path = state ? activePathOf(state) : null
  const hub = useChainHub(path?.chainId ?? null, loadHub)
  const route = useMemo(
    () => (hub && state && path ? computeRoute(hub, path, state, readCompletedCases(hub)) : null),
    [hub, path, state]
  )
  const step = route?.start ?? null

  if (!path || !step || !isCompletableCurrentStep(step, view, path.chainId, activeChainId)) return null

  return (
    <button
      type="button"
      onClick={() => updateLearner((current) => setProgress(current, step.id, 'done', new Date().toISOString()))}
      className="fixed bottom-20 right-4 z-50 inline-flex min-h-11 items-center gap-2 bg-[var(--editorial-accent)] px-5 py-3 text-sm font-semibold text-[var(--editorial-on-accent)] shadow-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-accent)] lg:bottom-6 lg:right-6"
    >
      이 단계 완료 <Check size={16} aria-hidden="true" />
    </button>
  )
}
