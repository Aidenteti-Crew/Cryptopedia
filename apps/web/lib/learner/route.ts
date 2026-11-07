import type { HubData } from '@/lib/cryptopedia-hub'
import { PRIMARY_NAV } from '@/lib/cryptopedia-taxonomy'

import type { LearnerPath, LearnerState } from './store'
import { SPECIAL_GOALS, TRACKS, knownFromExperience, type ExtraStep } from './tracks'

/* 경로 계산 — 저장하지 않고 매번 계산하는 순수 함수.
   1) 목표 개념: 처음부터 쌓기면 역할 트랙, 목표 이루기면 고른 케이스의 단계에 걸린 개념
   2) 학습 지도의 선행(PREREQUISITE) 관계를 거슬러 올라가 먼저 알아야 할 개념을 모두 넣는다
   3) 순서: 목표 목록 순서를 따르되 선행 개념이 항상 먼저 (깊이 우선 후위 순회)
   4) 해본 것·직접 완료로 아는 개념은 ✓, 처음 남은 단계가 '여기서 시작'
   5) 개념 뒤에 케이스 실습 · 에이전트 스킬 · LIVE 화면을 붙인다
   hub 에 없는 id(다른 체인 hub 등)는 조용히 뺀다. */

export type StepStatus = 'known' | 'done' | null

export interface RouteStep {
  kind: 'concept' | ExtraStep['kind']
  id: string
  title: string
  summary: string
  minutes: number
  status: StepStatus
  /** 개념 단계에서 — 목표 개념인지(false 면 선행이라 넣은 개념) */
  target: boolean
}

export interface ComputedRoute {
  name: string
  steps: RouteStep[]
  /** 처음 남은 단계 — 모두 마쳤으면 null */
  start: RouteStep | null
  /** 목표에는 없지만 선행이라 넣은 개념 id */
  added: string[]
  doneCount: number
  minutesLeft: number
}

const CONCEPT_MINUTES = 8
const SKILL_MINUTES = 10
const SCREEN_MINUTES = 5

export function prerequisitesOf(concept: HubData['concepts'][number]): string[] {
  return concept.relations.filter((r) => r.type === 'PREREQUISITE').map((r) => r.id)
}

export type RoutePath = Pick<LearnerPath, 'mode' | 'role' | 'goal' | 'chainId'>

/* 경로의 목표 — 트랙이면 표에서, 케이스면 hub 의 케이스 단계에서, 특별 목표(에이전트 등)면 표에서 */
export function pathTargets(
  hub: HubData,
  path: Pick<LearnerPath, 'mode' | 'role' | 'goal'>
): { name: string; concepts: string[]; extras: ExtraStep[] } {
  if (path.mode === 'track') return TRACKS[path.role]
  const special = path.goal ? SPECIAL_GOALS[path.goal] : undefined
  if (special) return { name: special.title, concepts: special.concepts, extras: special.extras }
  const study = hub.cases.find((item) => item.id === path.goal)
  if (!study) return { name: '목표 없음', concepts: [], extras: [] }
  return {
    name: study.title,
    concepts: [...new Set(study.steps.flatMap((step) => step.conceptIds))],
    extras: [
      { kind: 'case', id: study.id },
      ...study.skillIds.map((id) => ({ kind: 'skill' as const, id })),
    ],
  }
}

/* 개념별 상태 — 직접 기록(done/known/todo)이 해본 것 추정보다 우선 */
export function conceptStatus(
  id: string,
  state: Pick<LearnerState, 'profile' | 'progress'>,
  known: ReadonlySet<string>
): StepStatus {
  const entry = state.progress[id]
  if (entry?.status === 'done') return 'done'
  if (entry?.status === 'known') return 'known'
  if (entry?.status === 'todo') return null
  return known.has(id) ? 'known' : null
}

export function computeRoute(
  hub: HubData,
  path: RoutePath,
  state: Pick<LearnerState, 'profile' | 'progress'>,
  completedCases: ReadonlySet<string> = new Set()
): ComputedRoute {
  const { name, concepts: targets, extras } = pathTargets(hub, path)
  const byId = new Map(hub.concepts.map((concept) => [concept.id, concept]))
  const known = knownFromExperience(state.profile.experience, path.chainId)

  const order: string[] = []
  const seen = new Set<string>()
  const visit = (id: string) => {
    const concept = byId.get(id)
    if (!concept || seen.has(id)) return
    seen.add(id)
    prerequisitesOf(concept).forEach(visit)
    order.push(id)
  }
  targets.forEach(visit)

  const steps: RouteStep[] = order.map((id) => {
    const concept = byId.get(id)!
    return {
      kind: 'concept',
      id,
      title: concept.title,
      summary: concept.summary,
      minutes: CONCEPT_MINUTES,
      status: conceptStatus(id, state, known),
      target: targets.includes(id),
    }
  })

  for (const extra of extras) {
    const step = extraStep(hub, extra, state, completedCases)
    if (step) steps.push(step)
  }

  const left = steps.filter((step) => !step.status)
  return {
    name,
    steps,
    start: left[0] ?? null,
    added: order.filter((id) => !targets.includes(id)),
    doneCount: steps.length - left.length,
    minutesLeft: left.reduce((sum, step) => sum + step.minutes, 0),
  }
}

function extraStep(
  hub: HubData,
  extra: ExtraStep,
  state: Pick<LearnerState, 'progress'>,
  completedCases: ReadonlySet<string>
): RouteStep | null {
  const self = state.progress[extra.id]?.status
  const status: StepStatus = self === 'done' || self === 'known' ? self : null
  if (extra.kind === 'case') {
    const study = hub.cases.find((item) => item.id === extra.id)
    if (!study) return null
    return {
      kind: 'case',
      id: study.id,
      title: study.title,
      summary: study.summary,
      minutes: study.minutes,
      status: completedCases.has(study.id) ? 'done' : status,
      target: false,
    }
  }
  if (extra.kind === 'skill') {
    const skill = hub.skills.find((item) => item.id === extra.id)
    if (!skill) return null
    return {
      kind: 'skill',
      id: skill.id,
      title: skill.title,
      summary: skill.summary,
      minutes: SKILL_MINUTES,
      status,
      target: false,
    }
  }
  const screen = PRIMARY_NAV.find((item) => item.id === extra.id)
  if (!screen) return null
  return {
    kind: 'screen',
    id: screen.id,
    title: `${screen.label} 둘러보기`,
    summary: 'LIVE · 매일 갱신되는 생태계 자료',
    minutes: SCREEN_MINUTES,
    status,
    target: false,
  }
}
