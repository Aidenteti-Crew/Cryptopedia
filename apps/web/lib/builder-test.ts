/* Avalanche 빌더 유형 테스트 — 문항, 점수 계산, 동점 처리, 단계 전환.
   화면과 분리한 순수 로직이라 DOM 없이 테스트할 수 있다.

   이 테스트는 학습 경로를 고르기 위한 간단한 안내일 뿐, 개인의 성향이나 능력을 진단하지 않는다.

   설계 원칙
   · 선택지는 "몇 번째 보기"가 아니라 고유한 유형 ID(type)를 가진다. 점수·답변 저장·되돌아가기 모두 이 ID 기준이라
     화면에 보여 주는 순서를 섞어도 결과가 달라지지 않는다.
   · 동점이면 임의로 한 유형을 고르지 않는다 — 동점 유형들을 보여 주고 사용자가 직접 고르게 한다. */

export type BuilderTypeId = 'maker' | 'analyst' | 'architect' | 'connector'

/** 정규 유형 순서 — 동점 유형을 나열할 때와 섞기 전 기준 순서로만 쓴다 (화면에는 노출하지 않는다) */
export const BUILDER_TYPE_IDS: readonly BuilderTypeId[] = ['maker', 'analyst', 'architect', 'connector']

export interface BuilderOption {
  /** 이 선택지가 1점을 주는 유형 */
  type: BuilderTypeId
  text: string
}

export interface BuilderQuestion {
  id: string
  prompt: string
  /** 네 유형이 하나씩 — 소스에 적힌 순서는 표시 순서와 무관하다 */
  options: readonly [BuilderOption, BuilderOption, BuilderOption, BuilderOption]
}

export const BUILDER_QUESTIONS: readonly BuilderQuestion[] = [
  {
    id: 'q1',
    prompt: '새로운 기술을 발견했을 때, 가장 먼저 하고 싶은 일은 무엇인가요?',
    options: [
      { type: 'maker', text: '일단 실행해서 결과를 확인해 봅니다.' },
      { type: 'analyst', text: '어떤 원리로 작동하는지 이해하려고 합니다.' },
      { type: 'architect', text: '내 방식대로 구조를 바꿔 봅니다.' },
      { type: 'connector', text: '다른 기술과 연결할 방법을 찾아봅니다.' },
    ],
  },
  {
    id: 'q2',
    prompt: '프로젝트를 하나 만든다면 어떤 것이 가장 끌리시나요?',
    options: [
      { type: 'maker', text: '아이디어를 빠르게 구현해 볼 수 있는 애플리케이션' },
      { type: 'analyst', text: '블록체인이 어떻게 작동하는지 직접 살펴볼 수 있는 탐구 프로젝트' },
      { type: 'architect', text: '나만의 규칙을 가진 블록체인' },
      { type: 'connector', text: '서로 다른 네트워크를 연결하는 서비스' },
    ],
  },
  {
    id: 'q3',
    prompt: '개발하다 어려운 문제를 만나면 어떻게 하시나요?',
    options: [
      { type: 'maker', text: '작은 프로토타입부터 만들어 실험해 봅니다.' },
      { type: 'analyst', text: '공식 문서와 작동 원리를 확인합니다.' },
      { type: 'architect', text: '설계부터 다시 검토하고 개선합니다.' },
      { type: 'connector', text: '각 시스템이 어떻게 연결되어 있는지 살펴보고 문제의 원인을 찾습니다.' },
    ],
  },
  {
    id: 'q4',
    prompt: '지금 가장 먼저 탐험해 보고 싶은 분야는 무엇인가요?',
    options: [
      { type: 'maker', text: '실제 작동하는 블록체인 앱 만들기' },
      { type: 'analyst', text: '블록체인 네트워크의 구조와 작동 원리' },
      { type: 'architect', text: '나만의 블록체인 설계하기' },
      { type: 'connector', text: '서로 다른 블록체인을 연결하는 기술' },
    ],
  },
]

export const TOTAL_QUESTIONS = BUILDER_QUESTIONS.length

/** 질문별로 고른 선택지의 유형 ID. 아직 답하지 않았으면 null */
export type BuilderAnswers = readonly (BuilderTypeId | null)[]

/* ── 점수 · 판정 ─────────────────────────────────────────── */

export function scoreAnswers(answers: BuilderAnswers): Record<BuilderTypeId, number> {
  const scores: Record<BuilderTypeId, number> = { maker: 0, analyst: 0, architect: 0, connector: 0 }
  for (const type of answers) {
    if (type && type in scores) scores[type] += 1
  }
  return scores
}

export type BuilderOutcome =
  | { kind: 'single'; type: BuilderTypeId }
  /** 최고 점수가 같은 유형이 둘 이상 — 사용자가 가장 관심 있는 방향을 고른다 */
  | { kind: 'tie'; types: BuilderTypeId[] }

/** 최고 점수 유형. 최고점이 둘 이상이면 임의로 정하지 않고 동점 유형 전체(정규 순서)를 돌려준다.
   (예전의 "Q4 우선" 규칙은 없다.) */
export function resolveBuilderOutcome(answers: BuilderAnswers): BuilderOutcome {
  const scores = scoreAnswers(answers)
  const top = Math.max(...Object.values(scores))
  const leaders = BUILDER_TYPE_IDS.filter((type) => scores[type] === top)
  return leaders.length === 1 ? { kind: 'single', type: leaders[0] } : { kind: 'tie', types: leaders }
}

/* ── 표시 순서 섞기 ──────────────────────────────────────── */

/** 문항별 표시 순서 — 각 문항의 선택지 유형 ID 를 화면에 보여 줄 순서대로 나열한다 */
export type BuilderDisplayOrders = readonly (readonly BuilderTypeId[])[]

/** Fisher–Yates. rng 를 주입할 수 있어 테스트에서 결정적으로 쓸 수 있다. */
export function shuffled<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = items.slice()
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

/** 문항마다 따로 섞는다. 같은 유형이 모든 문항에서 같은 자리에 오지 않도록, 문항 간 순서가 겹치면 다시 섞는다. */
export function createDisplayOrders(rng: () => number = Math.random): BuilderDisplayOrders {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const orders = BUILDER_QUESTIONS.map(() => shuffled(BUILDER_TYPE_IDS, rng))
    const allDifferent =
      new Set(orders.map((order) => order.join('|'))).size === orders.length &&
      // 어떤 유형도 네 문항 모두에서 같은 자리에 있지 않다
      BUILDER_TYPE_IDS.every((type) => new Set(orders.map((order) => order.indexOf(type))).size > 1)
    if (allDifferent) return orders
  }
  // 극히 드문 경우의 안전한 대체: 문항마다 한 칸씩 돌린 순서
  return BUILDER_QUESTIONS.map((_, index) => BUILDER_TYPE_IDS.map((_, i) => BUILDER_TYPE_IDS[(i + index) % BUILDER_TYPE_IDS.length]))
}

/** 표시 순서를 적용한 선택지 목록 (화면용) */
export function optionsInDisplayOrder(question: BuilderQuestion, order: readonly BuilderTypeId[]): BuilderOption[] {
  return order.map((type) => question.options.find((option) => option.type === type)!)
}

/* ── 진행 상태 ───────────────────────────────────────────── */

export interface BuilderTestState {
  /** 0~3: 해당 질문 표시, 4(=질문 수): 결과 단계(단일 결과 또는 동점 선택) */
  step: number
  /** 질문별로 고른 유형 ID */
  answers: (BuilderTypeId | null)[]
  /** 문항별 표시 순서 — 한 번의 테스트 동안 고정된다 */
  orders: BuilderDisplayOrders
  /** 동점일 때 사용자가 고른 유형 */
  chosen: BuilderTypeId | null
}

export type BuilderTestAction =
  | { type: 'answer'; option: BuilderTypeId }
  | { type: 'choose'; option: BuilderTypeId }
  | { type: 'back' }
  | { type: 'reset'; orders?: BuilderDisplayOrders }

export function initialBuilderTestState(orders: BuilderDisplayOrders = createDisplayOrders()): BuilderTestState {
  return { step: 0, answers: Array.from({ length: TOTAL_QUESTIONS }, () => null), orders, chosen: null }
}

export function isBuilderTestComplete(state: BuilderTestState) {
  return state.step >= TOTAL_QUESTIONS
}

/** 결과 단계에서 화면이 보여 줄 것:
   · 'question' — 아직 질문 중
   · 'choose'   — 동점이라 사용자가 방향을 골라야 함 (types = 동점 유형)
   · 'result'   — 최종 유형 (단일 결과이거나, 동점에서 사용자가 고른 유형) */
export type BuilderTestView =
  | { kind: 'question' }
  | { kind: 'choose'; types: BuilderTypeId[] }
  | { kind: 'result'; type: BuilderTypeId; fromTie: boolean }

export function getBuilderTestView(state: BuilderTestState): BuilderTestView {
  if (!isBuilderTestComplete(state)) return { kind: 'question' }
  const outcome = resolveBuilderOutcome(state.answers)
  if (outcome.kind === 'single') return { kind: 'result', type: outcome.type, fromTie: false }
  if (state.chosen && outcome.types.includes(state.chosen)) return { kind: 'result', type: state.chosen, fromTie: true }
  return { kind: 'choose', types: outcome.types }
}

export function builderTestReducer(state: BuilderTestState, action: BuilderTestAction): BuilderTestState {
  switch (action.type) {
    case 'answer': {
      if (isBuilderTestComplete(state)) return state
      if (!BUILDER_TYPE_IDS.includes(action.option)) return state
      const answers = state.answers.slice()
      answers[state.step] = action.option
      return { ...state, step: state.step + 1, answers, chosen: null }
    }
    case 'choose': {
      if (!isBuilderTestComplete(state)) return state
      const outcome = resolveBuilderOutcome(state.answers)
      // 동점 유형 중에서만 고를 수 있다
      if (outcome.kind !== 'tie' || !outcome.types.includes(action.option)) return state
      return { ...state, chosen: action.option }
    }
    case 'back':
      // 이전 질문으로 — 이전에 고른 답은 유형 ID 로 그대로 남는다(표시 순서가 같으므로 같은 항목이 선택돼 보인다).
      // 동점 선택을 되돌리면 선택도 지운다.
      return state.step > 0 ? { ...state, step: state.step - 1, chosen: null } : state
    case 'reset':
      // 다시 테스트 — 답변과 선택을 지우고 표시 순서도 새로 섞는다
      return initialBuilderTestState(action.orders)
  }
}
