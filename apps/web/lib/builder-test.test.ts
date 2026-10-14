import assert from "node:assert/strict"
import test from "node:test"

import {
  BUILDER_QUESTIONS,
  BUILDER_TYPE_IDS,
  TOTAL_QUESTIONS,
  builderTestReducer,
  createDisplayOrders,
  getBuilderTestView,
  initialBuilderTestState,
  isBuilderTestComplete,
  optionsInDisplayOrder,
  resolveBuilderOutcome,
  scoreAnswers,
  shuffled,
  type BuilderTestAction,
  type BuilderTestState,
  type BuilderTypeId,
} from "./builder-test"

/** 결정적 난수 (mulberry32) — 섞기 테스트를 재현 가능하게 한다 */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TYPES = [...BUILDER_TYPE_IDS]
const identityOrders = BUILDER_QUESTIONS.map(() => TYPES)
const fresh = (orders = identityOrders) => initialBuilderTestState(orders)
const run = (actions: BuilderTestAction[], from: BuilderTestState = fresh()) => actions.reduce(builderTestReducer, from)
const answer = (option: BuilderTypeId): BuilderTestAction => ({ type: "answer", option })
const all256 = (): BuilderTypeId[][] => {
  const out: BuilderTypeId[][] = []
  for (const a of TYPES) for (const b of TYPES) for (const c of TYPES) for (const d of TYPES) out.push([a, b, c, d])
  return out
}

/* ── 문항 ─────────────────────────────────────────────── */

test("has four questions, each offering exactly one option per builder type", () => {
  assert.equal(TOTAL_QUESTIONS, 4)
  for (const question of BUILDER_QUESTIONS) {
    assert.equal(question.options.length, 4, question.id)
    assert.deepEqual(question.options.map((option) => option.type).sort(), [...TYPES].sort(), question.id)
    assert.ok(question.options.every((option) => option.text.trim().length > 0), question.id)
  }
})

test("the questions and options are exactly the final wording, mapped to the right types", () => {
  const expected: Record<string, { prompt: string; options: Record<BuilderTypeId, string> }> = {
    q1: {
      prompt: "새로운 기술을 발견했을 때, 가장 먼저 하고 싶은 일은 무엇인가요?",
      options: {
        maker: "일단 실행해서 결과를 확인해 봅니다.",
        analyst: "어떤 원리로 작동하는지 이해하려고 합니다.",
        architect: "내 방식대로 구조를 바꿔 봅니다.",
        connector: "다른 기술과 연결할 방법을 찾아봅니다.",
      },
    },
    q2: {
      prompt: "프로젝트를 하나 만든다면 어떤 것이 가장 끌리시나요?",
      options: {
        maker: "아이디어를 빠르게 구현해 볼 수 있는 애플리케이션",
        analyst: "블록체인이 어떻게 작동하는지 직접 살펴볼 수 있는 탐구 프로젝트",
        architect: "나만의 규칙을 가진 블록체인",
        connector: "서로 다른 네트워크를 연결하는 서비스",
      },
    },
    q3: {
      prompt: "개발하다 어려운 문제를 만나면 어떻게 하시나요?",
      options: {
        maker: "작은 프로토타입부터 만들어 실험해 봅니다.",
        analyst: "공식 문서와 작동 원리를 확인합니다.",
        architect: "설계부터 다시 검토하고 개선합니다.",
        connector: "각 시스템이 어떻게 연결되어 있는지 살펴보고 문제의 원인을 찾습니다.",
      },
    },
    q4: {
      prompt: "지금 가장 먼저 탐험해 보고 싶은 분야는 무엇인가요?",
      options: {
        maker: "실제 작동하는 블록체인 앱 만들기",
        analyst: "블록체인 네트워크의 구조와 작동 원리",
        architect: "나만의 블록체인 설계하기",
        connector: "서로 다른 블록체인을 연결하는 기술",
      },
    },
  }
  assert.deepEqual(BUILDER_QUESTIONS.map((question) => question.id), ["q1", "q2", "q3", "q4"])
  for (const question of BUILDER_QUESTIONS) {
    const want = expected[question.id]
    assert.equal(question.prompt, want.prompt, question.id)
    for (const option of question.options) assert.equal(option.text, want.options[option.type], `${question.id}/${option.type}`)
  }
})

test("all questions and options use polite speech", () => {
  const plainEnding = /(?<!니)다$/ // 한다·본다·이다 같은 평서 반말 종결 (…니다 는 존댓말)
  for (const question of BUILDER_QUESTIONS) {
    assert.match(question.prompt, /(요|까요|나요|시나요)\?$/, question.prompt)
    assert.doesNotMatch(question.prompt, /끌려\?$/)
    for (const option of question.options) {
      assert.doesNotMatch(option.text.replace(/\.$/, ""), plainEnding, `${question.id}: ${option.text}`)
    }
  }
})

test("the option wording is distinct per type and the type ids never appear on screen", () => {
  for (const question of BUILDER_QUESTIONS) {
    assert.equal(new Set(question.options.map((option) => option.text)).size, 4, question.id)
    for (const option of question.options) {
      assert.doesNotMatch(option.text, /\b(maker|analyst|architect|connector)\b/i, option.text)
      assert.doesNotMatch(option.text, /^[A-D][.)]\s/)
    }
  }
})

/* ── 점수 · 판정: 256가지 전체 ─────────────────────────── */

test("scores are computed from the option's type id (one point each)", () => {
  assert.deepEqual(scoreAnswers(["maker", "maker", "analyst", "connector"]), { maker: 2, analyst: 1, architect: 0, connector: 1 })
  assert.deepEqual(scoreAnswers([null, "architect", null, null]), { maker: 0, analyst: 0, architect: 1, connector: 0 })
})

test("all 256 answer combinations resolve consistently with an independent count", () => {
  let singles = 0
  let ties = 0
  const tieSizes: Record<number, number> = {}
  for (const answers of all256()) {
    const counts = Object.fromEntries(TYPES.map((type) => [type, answers.filter((a) => a === type).length]))
    const top = Math.max(...Object.values(counts))
    const leaders = TYPES.filter((type) => counts[type] === top)
    const outcome = resolveBuilderOutcome(answers)

    if (leaders.length === 1) {
      singles += 1
      assert.deepEqual(outcome, { kind: "single", type: leaders[0] }, answers.join())
    } else {
      ties += 1
      tieSizes[leaders.length] = (tieSizes[leaders.length] ?? 0) + 1
      assert.deepEqual(outcome, { kind: "tie", types: leaders }, answers.join())
    }
  }
  assert.equal(singles + ties, 256)
  assert.equal(singles, 196)
  assert.equal(ties, 60)
  // with four answers only 2-way (2-2) and 4-way (1-1-1-1) ties can occur
  assert.deepEqual(tieSizes, { 2: 36, 4: 24 })
})

test("every type is the unique winner equally often (no type is favoured)", () => {
  const wins: Record<string, number> = { maker: 0, analyst: 0, architect: 0, connector: 0 }
  for (const answers of all256()) {
    const outcome = resolveBuilderOutcome(answers)
    if (outcome.kind === "single") wins[outcome.type] += 1
  }
  assert.deepEqual(wins, { maker: 49, analyst: 49, architect: 49, connector: 49 })
})

test("the outcome does not depend on the order in which questions were answered (no Q4 priority)", () => {
  for (const answers of all256()) {
    const forward = resolveBuilderOutcome(answers)
    const reversed = resolveBuilderOutcome([...answers].reverse())
    const rotated = resolveBuilderOutcome([...answers.slice(1), answers[0]])
    assert.deepEqual(reversed, forward, answers.join())
    assert.deepEqual(rotated, forward, answers.join())
  }
})

/* ── 동점 처리 ─────────────────────────────────────────── */

test("a two-way tie returns both types instead of picking one, whatever Q4 was", () => {
  assert.deepEqual(resolveBuilderOutcome(["maker", "maker", "architect", "architect"]), { kind: "tie", types: ["maker", "architect"] })
  // same tie with Q4 answered by either side — still a tie, still both types
  assert.deepEqual(resolveBuilderOutcome(["architect", "architect", "maker", "maker"]), { kind: "tie", types: ["maker", "architect"] })
  assert.deepEqual(resolveBuilderOutcome(["analyst", "connector", "analyst", "connector"]), { kind: "tie", types: ["analyst", "connector"] })
})

test("a four-way tie returns all four types", () => {
  assert.deepEqual(resolveBuilderOutcome(["connector", "analyst", "maker", "architect"]), { kind: "tie", types: TYPES })
})

test("ties with three or more leading types are handled the same way", () => {
  // not reachable with four full answers (see the 256 test) but the rule is generic
  assert.deepEqual(resolveBuilderOutcome(["maker", "analyst", "architect"]), { kind: "tie", types: ["maker", "analyst", "architect"] })
  assert.deepEqual(resolveBuilderOutcome(["connector", "analyst", "maker"]), { kind: "tie", types: ["maker", "analyst", "connector"] })
})

test("the tie view lists the tied types and a valid pick leads to that type's result", () => {
  const state = run([answer("maker"), answer("architect"), answer("maker"), answer("architect")])
  assert.deepEqual(getBuilderTestView(state), { kind: "choose", types: ["maker", "architect"] })

  const picked = run([{ type: "choose", option: "architect" }], state)
  assert.deepEqual(getBuilderTestView(picked), { kind: "result", type: "architect", fromTie: true })
  const other = run([{ type: "choose", option: "maker" }], picked)
  assert.deepEqual(getBuilderTestView(other), { kind: "result", type: "maker", fromTie: true })
})

test("only a tied type can be chosen, and only when the outcome is a tie", () => {
  const tie = run([answer("maker"), answer("architect"), answer("maker"), answer("architect")])
  assert.equal(run([{ type: "choose", option: "analyst" }], tie), tie) // not tied
  const single = run([answer("maker"), answer("maker"), answer("maker"), answer("analyst")])
  assert.equal(run([{ type: "choose", option: "analyst" }], single), single) // no tie at all
  assert.deepEqual(getBuilderTestView(single), { kind: "result", type: "maker", fromTie: false })
  assert.equal(run([{ type: "choose", option: "maker" }], fresh()).chosen, null) // mid-test
})

test("going back from the tie screen clears the pick and lets answers change the outcome", () => {
  let state = run([answer("maker"), answer("architect"), answer("maker"), answer("architect"), { type: "choose", option: "maker" }])
  state = run([{ type: "back" }], state)
  assert.equal(state.step, 3)
  assert.equal(state.chosen, null)
  // change Q4 from architect to maker → maker now wins outright
  state = run([answer("maker")], state)
  assert.deepEqual(getBuilderTestView(state), { kind: "result", type: "maker", fromTie: false })
})

/* ── 되돌아가기 · 선택 변경 ─────────────────────────────── */

test("answering advances one question at a time and finishes after the fourth", () => {
  let state = fresh()
  assert.equal(state.step, 0)
  state = run([answer("maker")], state)
  assert.equal(state.step, 1)
  state = run([answer("analyst"), answer("architect")], state)
  assert.equal(state.step, 3)
  assert.equal(isBuilderTestComplete(state), false)
  state = run([answer("connector")], state)
  assert.equal(isBuilderTestComplete(state), true)
  assert.deepEqual(state.answers, ["maker", "analyst", "architect", "connector"])
})

test("going back keeps the earlier answers exactly, changing one moves forward again", () => {
  let state = run([answer("maker"), answer("analyst")])
  state = run([{ type: "back" }], state)
  assert.equal(state.step, 1)
  assert.deepEqual(state.answers, ["maker", "analyst", null, null])
  state = run([answer("connector")], state) // change Q2
  assert.deepEqual(state.answers, ["maker", "connector", null, null])
  assert.equal(state.step, 2)
})

test("back never goes before the first question", () => {
  assert.equal(run([{ type: "back" }]).step, 0)
})

test("the previous selection stays on the very same option after going back, whatever the display order", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const orders = createDisplayOrders(seeded(seed))
    for (let position = 0; position < 4; position += 1) {
      const question = 1 // Q2
      const picked = optionsInDisplayOrder(BUILDER_QUESTIONS[question], orders[question])[position]
      let state = initialBuilderTestState(orders)
      state = run([answer(optionsInDisplayOrder(BUILDER_QUESTIONS[0], orders[0])[0].type), answer(picked.type), { type: "back" }], state)
      assert.equal(state.step, question)
      // the answer is stored by type id → the highlighted item is the one at the same displayed position
      const shown = optionsInDisplayOrder(BUILDER_QUESTIONS[question], state.orders[question])
      assert.equal(shown.findIndex((option) => option.type === state.answers[question]), position, `seed ${seed}`)
      assert.equal(shown[position].text, picked.text)
    }
  }
})

test("answers outside the four type ids are ignored and a finished test ignores further answers", () => {
  const start = fresh()
  assert.equal(run([{ type: "answer", option: "wizard" as BuilderTypeId }], start), start)
  const finished = run([answer("maker"), answer("maker"), answer("maker"), answer("maker")])
  assert.equal(run([answer("analyst")], finished), finished)
})

test("reset clears answers and the pick, and takes a fresh display order", () => {
  const finished = run([answer("maker"), answer("architect"), answer("maker"), answer("architect"), { type: "choose", option: "architect" }])
  const nextOrders = createDisplayOrders(seeded(99))
  const again = run([{ type: "reset", orders: nextOrders }], finished)
  assert.equal(again.step, 0)
  assert.deepEqual(again.answers, [null, null, null, null])
  assert.equal(again.chosen, null)
  assert.equal(again.orders, nextOrders)
})

/* ── 표시 순서 섞기 ─────────────────────────────────────── */

test("shuffled returns a permutation and never mutates its input", () => {
  const input = [...TYPES]
  const out = shuffled(input, seeded(7))
  assert.deepEqual([...out].sort(), [...TYPES].sort())
  assert.deepEqual(input, TYPES)
})

test("each question gets its own shuffled order made of the four type ids", () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const orders = createDisplayOrders(seeded(seed))
    assert.equal(orders.length, 4)
    for (const order of orders) assert.deepEqual([...order].sort(), [...TYPES].sort())
    // the questions do not all share one order
    assert.ok(new Set(orders.map((order) => order.join("|"))).size > 1, `seed ${seed}`)
  }
})

test("no type sits in the same position in every question, so a fixed position never maps to one type", () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const orders = createDisplayOrders(seeded(seed))
    for (const type of TYPES) {
      const positions = new Set(orders.map((order) => order.indexOf(type)))
      assert.ok(positions.size > 1, `seed ${seed}: ${type} is always at position ${[...positions][0]}`)
    }
    // consequence: picking the same position every time yields at least two different types
    for (let position = 0; position < 4; position += 1) {
      const picked = new Set(orders.map((order) => order[position]))
      assert.ok(picked.size > 1, `seed ${seed} position ${position}`)
    }
  }
})

test("optionsInDisplayOrder returns the options in exactly the requested order", () => {
  const order: BuilderTypeId[] = ["connector", "maker", "architect", "analyst"]
  for (const question of BUILDER_QUESTIONS) {
    const shown = optionsInDisplayOrder(question, order)
    assert.deepEqual(shown.map((option) => option.type), order)
    for (const option of shown) assert.ok(question.options.includes(option))
  }
})

test("the shuffle uses Math.random by default and still produces valid orders", () => {
  const orders = createDisplayOrders()
  assert.equal(orders.length, 4)
  for (const order of orders) assert.deepEqual([...order].sort(), [...TYPES].sort())
})
