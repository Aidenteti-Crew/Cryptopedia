import { z } from 'zod'

import type { HubData } from '@/lib/cryptopedia-hub'
import { EXPERIENCE_IDS, ROLE_IDS, type ExperienceId, type LearnerRole } from './tracks'

/* 학습자 기록 — 1단계는 이 브라우저의 localStorage 한 키에 저장한다.
   화면은 LearnerStore 만 쓰므로, 로그인을 붙일 때 같은 인터페이스의 API 저장소로 바꾸면 된다.
   경로의 순서·단계는 저장하지 않는다 — 목표 · 완료 기록 · hub.json 으로 매번 계산한다(route.ts). */

export const LEARNER_STORAGE_KEY = 'cryptopedia-learner:v1'

const roleSchema = z.enum(ROLE_IDS as [LearnerRole, ...LearnerRole[]])
const experienceSchema = z.enum(EXPERIENCE_IDS as [ExperienceId, ...ExperienceId[]])

/* known = 이미 앎 · done = 직접 마침 · todo = 해본 것으로 아는 개념을 사용자가 되돌림 */
const progressEntrySchema = z.object({
  status: z.enum(['known', 'done', 'todo']),
  at: z.string(),
})

const pathSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mode: z.enum(['track', 'goal']),
  role: roleSchema,
  /** 설문 첫 단계에서 고른 체인 (chains.json id) — 예전 기록은 Avalanche */
  chainId: z.string().min(1).default('avalanche'),
  /** 목표 이루기일 때 고른 목표 — 케이스 id 또는 SPECIAL_GOALS 의 id */
  goal: z.string().nullable(),
  createdAt: z.string(),
})

const learnerStateSchema = z.object({
  version: z.literal(1),
  profile: z.object({
    role: roleSchema.nullable(),
    experience: z.array(experienceSchema),
  }),
  progress: z.record(z.string(), progressEntrySchema),
  paths: z.array(pathSchema),
  activePathId: z.string().nullable(),
  ui: z.object({ onboardingDismissed: z.boolean() }),
})

export type LearnerState = z.infer<typeof learnerStateSchema>
export type LearnerPath = z.infer<typeof pathSchema>
export type ProgressEntry = z.infer<typeof progressEntrySchema>

export function emptyLearnerState(): LearnerState {
  return {
    version: 1,
    profile: { role: null, experience: [] },
    progress: {},
    paths: [],
    activePathId: null,
    ui: { onboardingDismissed: false },
  }
}

/* 형식이 다르거나 깨진 기록은 버리고 빈 상태로 시작한다 (옛 기록 때문에 화면이 깨지지 않게) */
export function parseLearnerState(raw: unknown): LearnerState {
  const parsed = learnerStateSchema.safeParse(raw)
  return parsed.success ? parsed.data : emptyLearnerState()
}

export interface LearnerStore {
  load(): Promise<LearnerState>
  /** 저장하지 못하면 false — 화면은 메모리 상태로 계속 동작한다 */
  save(state: LearnerState): Promise<boolean>
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function createLocalLearnerStore(
  storage: KeyValueStorage | null = browserStorage()
): LearnerStore {
  return {
    async load() {
      try {
        const text = storage?.getItem(LEARNER_STORAGE_KEY)
        return text ? parseLearnerState(JSON.parse(text)) : emptyLearnerState()
      } catch {
        return emptyLearnerState()
      }
    },
    async save(state) {
      if (!storage) return false
      try {
        storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(state))
        return true
      } catch {
        return false
      }
    },
  }
}

/* 케이스 실습 완료는 케이스 화면이 이미 남기는 기록(cryptopedia-study:<케이스>, 체크한 항목 번호 배열)을 읽는다.
   같은 정보를 학습자 기록에 다시 쓰지 않는다. 체크 항목을 모두 체크했으면 완료. */
export function readCompletedCases(
  hub: Pick<HubData, 'cases'>,
  storage: Pick<Storage, 'getItem'> | null = browserStorage()
): Set<string> {
  const done = new Set<string>()
  if (!storage) return done
  for (const study of hub.cases) {
    try {
      const saved: unknown = JSON.parse(storage.getItem(`cryptopedia-study:${study.id}`) ?? '[]')
      if (!Array.isArray(saved)) continue
      const checked = new Set(
        saved.filter(
          (value) => Number.isInteger(value) && value >= 0 && value < study.checks.length
        )
      )
      if (checked.size === study.checks.length) done.add(study.id)
    } catch {
      /* 읽을 수 없는 기록은 미완료로 둔다 */
    }
  }
  return done
}
