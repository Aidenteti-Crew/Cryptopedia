import type { LearnerPath, LearnerState, ProgressEntry } from './store'
import type { ExperienceId, LearnerRole } from './tracks'

/* 학습자 기록을 바꾸는 순수 함수 — 화면(use-learner)은 이것만 거쳐 기록을 바꾼다.
   새 상태를 돌려줄 뿐 저장은 하지 않는다. */

export interface PathDraft {
  mode: LearnerPath['mode']
  role: LearnerRole
  goal: string | null
  name: string
}

export function setProfile(
  state: LearnerState,
  role: LearnerRole,
  experience: readonly ExperienceId[]
): LearnerState {
  return { ...state, profile: { role, experience: [...new Set(experience)] } }
}

/* 새 경로를 만들고 지금 보는 경로로 고른다. 설문을 끝낸 사람은 다시 전체 화면 설문을 볼 필요가 없다. */
export function addPath(
  state: LearnerState,
  draft: PathDraft,
  id: string,
  now: string
): LearnerState {
  const path: LearnerPath = {
    id,
    name: draft.name,
    mode: draft.mode,
    role: draft.role,
    goal: draft.mode === 'goal' ? draft.goal : null,
    createdAt: now,
  }
  return {
    ...state,
    paths: [...state.paths, path],
    activePathId: id,
    ui: { ...state.ui, onboardingDismissed: true },
  }
}

export function selectPath(state: LearnerState, id: string): LearnerState {
  return state.paths.some((path) => path.id === id) ? { ...state, activePathId: id } : state
}

/* 경로를 지워도 완료 기록은 남긴다 — 다른 경로와 공유하는 기록이라서 */
export function removePath(state: LearnerState, id: string): LearnerState {
  const paths = state.paths.filter((path) => path.id !== id)
  const activePathId =
    state.activePathId === id ? (paths[paths.length - 1]?.id ?? null) : state.activePathId
  return { ...state, paths, activePathId }
}

export function renamePath(state: LearnerState, id: string, name: string): LearnerState {
  const trimmed = name.trim()
  if (!trimmed) return state
  return {
    ...state,
    paths: state.paths.map((path) => (path.id === id ? { ...path, name: trimmed } : path)),
  }
}

/* status 가 null 이면 기록을 지운다(해본 것 추정으로 돌아감) */
export function setProgress(
  state: LearnerState,
  id: string,
  status: ProgressEntry['status'] | null,
  now: string
): LearnerState {
  const progress = { ...state.progress }
  if (status) progress[id] = { status, at: now }
  else delete progress[id]
  return { ...state, progress }
}

export function dismissOnboarding(state: LearnerState): LearnerState {
  return { ...state, ui: { ...state.ui, onboardingDismissed: true } }
}

export function activePathOf(state: LearnerState): LearnerPath | null {
  return state.paths.find((path) => path.id === state.activePathId) ?? state.paths[0] ?? null
}
