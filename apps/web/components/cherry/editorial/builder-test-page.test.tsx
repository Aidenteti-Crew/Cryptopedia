import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { AVALANCHE_HOME, BUILDER_RESULT_COPY } from '@/lib/avalanche-home'
import {
  BUILDER_QUESTIONS,
  BUILDER_TYPE_IDS,
  optionsInDisplayOrder,
  type BuilderTypeId,
} from '@/lib/builder-test'
import { BuilderTestPage, BuilderTestQuestion, BuilderTestResult, BuilderTestTie } from './builder-test-page'

const noop = () => undefined
const TYPES = [...BUILDER_TYPE_IDS]
const typeOf = (id: string) => AVALANCHE_HOME.builderTypes.find((type) => type.id === id)!

/** 사용자에게 보이는 텍스트만 (태그·스타일 속성 제외) */
const visibleText = (html: string) => html.replace(/<[^>]+>/g, ' ')
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const renderResult = (id: string) =>
  renderToStaticMarkup(<BuilderTestResult result={typeOf(id)} onOpen={noop} onRestart={noop} />)

const renderQuestion = (step: number, order: BuilderTypeId[] = TYPES, selected: BuilderTypeId | null = null) =>
  renderToStaticMarkup(
    <BuilderTestQuestion
      step={step}
      options={optionsInDisplayOrder(BUILDER_QUESTIONS[step], order)}
      selected={selected}
      onChoose={noop}
      onBack={noop}
    />
  )

/* ── 질문 화면 ─────────────────────────────────────────── */

test('starts on question 1 of 4 with a 1/4 progress bar and four vertical options, without A–D letters', () => {
  const html = renderToStaticMarkup(<BuilderTestPage content={AVALANCHE_HOME} onOpen={noop} />)

  assert.match(html, /1 \/ 4/)
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="1"/)
  assert.match(html, /style="width:25%"/)
  assert.match(html, new RegExp(escapeRe(BUILDER_QUESTIONS[0].prompt)))
  for (const option of BUILDER_QUESTIONS[0].options) assert.match(html, new RegExp(escapeRe(option.text)))
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 4)
  assert.doesNotMatch(visibleText(html), /(^|\s)[ABCD](\s|$)/, 'no A–D letters are shown')
  // only the current question is shown
  assert.doesNotMatch(html, new RegExp(escapeRe(BUILDER_QUESTIONS[1].prompt)))
  // nothing to go back to on the first question
  assert.match(html, /class="[^"]*invisible[^"]*"[^>]*tabindex="-1"/)
})

test('progress follows the step (1/4 … 4/4) and shows the matching question', () => {
  BUILDER_QUESTIONS.forEach((question, step) => {
    const html = renderQuestion(step)
    assert.match(html, new RegExp(`${step + 1} / 4`))
    assert.match(html, new RegExp(`aria-valuenow="${step + 1}"`))
    assert.match(html, new RegExp(escapeRe(question.prompt)))
  })
})

test('options are rendered in the given display order', () => {
  const order: BuilderTypeId[] = ['connector', 'maker', 'architect', 'analyst']
  BUILDER_QUESTIONS.forEach((_, step) => {
    const html = renderQuestion(step, order)
    const shown = [...html.matchAll(/data-option-type="(\w+)"/g)].map((match) => match[1])
    assert.deepEqual(shown, order, `question ${step + 1}`)
  })
})

test('a previously chosen option is marked by its type id, whatever the display order, and back is available after Q1', () => {
  for (const order of [TYPES, [...TYPES].reverse(), ['architect', 'connector', 'maker', 'analyst'] as BuilderTypeId[]]) {
    const html = renderQuestion(2, order, 'analyst')
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1)
    const pressed = html.match(/<button[^>]*aria-pressed="true"[^>]*>/)![0]
    assert.match(pressed, /data-option-type="analyst"/)
    assert.match(html, /이전 질문/)
    assert.doesNotMatch(html, /invisible/)
  }
})

/* ── 동점 화면 ─────────────────────────────────────────── */

test('the tie screen lists every tied type and asks which direction interests the user most', () => {
  for (const ids of [['maker', 'architect'], ['maker', 'analyst', 'connector'], TYPES] as BuilderTypeId[][]) {
    const html = renderToStaticMarkup(
      <BuilderTestTie candidates={ids.map(typeOf)} onPick={noop} onBack={noop} />
    )
    assert.match(html, /가장 관심 있는 방향을 골라 주세요/)
    for (const id of ids) {
      assert.match(html, new RegExp(escapeRe(typeOf(id).name)))
      assert.match(html, new RegExp(escapeRe(typeOf(id).label)))
      assert.match(html, new RegExp(`data-option-type="${id}"`))
    }
    assert.equal((html.match(/data-option-type=/g) ?? []).length, ids.length)
    assert.match(html, /이전 질문/)
    // not a diagnosis, and no scores
    assert.doesNotMatch(visibleText(html), /\d+\s*%|점수|진단 결과/)
  }
})

/* ── 결과 화면 ─────────────────────────────────────────── */

test('every result is a builder profile: label, name, English label, symbol and the top description', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    assert.doesNotMatch(html, /YOUR BUILDER PROFILE/)
    assert.match(html, new RegExp(escapeRe(type.name)))
    assert.match(html, new RegExp(escapeRe(type.label)))
    assert.match(html, new RegExp(`data-symbol="${type.id}"`))
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    assert.match(header, new RegExp(escapeRe(type.description)))
    // the top copy is about the person; the bottom (path) copy is about the content — not mixed
    assert.doesNotMatch(header, new RegExp(escapeRe(type.rationale)))
    assert.doesNotMatch(html.slice(html.indexOf('</header>')), new RegExp(escapeRe(type.description)))
    assert.doesNotMatch(visibleText(html), /성격|심리|당신은 .*사람/)
  }
})

test('the hero is tighter than before: padding trimmed ~15–20%, name and symbol layout unchanged', () => {
  const html = renderResult('maker')
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  // was pb-12 pt-10 / lg:pb-14 lg:pt-12 → now pb-10 pt-8 / lg:pb-12 lg:pt-10
  assert.match(header, /pb-10 pt-8/)
  assert.match(header, /lg:pb-12 lg:pt-10/)
  assert.doesNotMatch(header, /pb-12 pt-10|lg:pb-14/)
  // symbol + name stay side by side on desktop
  assert.match(header, /sm:flex-row sm:items-center/)
  assert.match(header, /sm:h-\[120px\] sm:w-\[120px\]/)
})

test('the not-a-diagnosis note is kept but sits small at the very bottom, away from the hero', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    assert.doesNotMatch(header, new RegExp(escapeRe(BUILDER_RESULT_COPY.disclaimer)))
    assert.match(html, new RegExp(escapeRe(BUILDER_RESULT_COPY.disclaimer)))
    assert.ok(html.indexOf(BUILDER_RESULT_COPY.disclaimer) > html.indexOf('다시 테스트하기'), 'after the actions')
    const note = html.match(/<p[^>]*>(?=[^<]*진단하는 결과가 아닙니다)/)![0]
    assert.match(note, /text-\[11px\]/)
    assert.match(note, /opacity-80/)
  }
})

test('traits are small inline keywords (bright keyword, quiet note), not a three-column grid or cards', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    assert.match(html, /빌더 특성/)
    const list = html.slice(html.indexOf('빌더 특성'), html.indexOf(BUILDER_RESULT_COPY.pathHeading))
    assert.equal((list.match(/<li/g) ?? []).length, 3, type.id)
    assert.match(list, /flex flex-wrap/)
    assert.doesNotMatch(list, /grid-cols|border-r|border-t|bg-\[|rounded/)
    for (const keyword of type.keywords) {
      assert.match(list, new RegExp(`text-\\[var\\(--editorial-strong\\)\\]">${escapeRe(keyword.term)}<`)) // bright
      assert.match(list, new RegExp(`text-\\[var\\(--editorial-muted\\)\\]"> · ${escapeRe(keyword.note)}<`)) // quiet gray
    }
    assert.doesNotMatch(visibleText(html), /\d+\s*%|점수|퍼센트|레이더|차트/)
    assert.doesNotMatch(html, /progressbar/)
  }
})

test('the path is a numbered vertical timeline; every step is a real link and the rationale sits above it', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    const path = html.slice(html.indexOf(BUILDER_RESULT_COPY.pathHeading))
    assert.match(path, new RegExp(escapeRe(type.rationale)))
    assert.match(path, new RegExp(escapeRe(BUILDER_RESULT_COPY.pathCaption)))
    const roadmap = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'))
    type.path.forEach((step, index) => {
      assert.match(roadmap, new RegExp(`>${String(index + 1).padStart(2, '0')}<`))
      assert.match(roadmap, new RegExp(escapeRe(step.title)))
      assert.match(roadmap, new RegExp(escapeRe(step.description)))
    })
    assert.equal((roadmap.match(/<button/g) ?? []).length, type.path.length, type.id)
    // uniform spacing between steps
    assert.equal((roadmap.match(/pb-8 pl-8 last:pb-0/g) ?? []).length, type.path.length)
    assert.doesNotMatch(roadmap, /준비 중/)
  }
})

test('START HERE appears once, on step 01, which is also the only lavender number and filled marker', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    assert.equal((html.match(/START HERE/g) ?? []).length, 1, type.id)
    const items = html.slice(html.indexOf('<ol'), html.indexOf('</ol>')).split('<li').slice(1)
    assert.match(items[0], /START HERE/)
    assert.match(items[0], /text-\[var\(--editorial-accent\)\]">01</)
    assert.match(items[0], /bg-\[var\(--editorial-accent\)\]/) // filled lavender marker
    for (const item of items.slice(1)) {
      assert.doesNotMatch(item, /START HERE/)
      assert.doesNotMatch(item, /bg-\[var\(--editorial-accent\)\]/) // calm marker
      assert.doesNotMatch(item, /text-\[var\(--editorial-accent\)\]">0\d</) // calm number
    }
    // title → description gap is tidy and the same for every step
    assert.equal((html.match(/mt-1 block pl-\[34px\]/g) ?? []).length, type.path.length)
  }
})

test('hero and body start on the same 960px centered column', () => {
  const html = renderResult('maker')
  assert.equal((html.match(/mx-auto max-w-\[960px\]/g) ?? []).length, 2)
  assert.doesNotMatch(html, /max-w-\[8\d\d px\]|w-screen/)
})

test('each type has its own minimal symbol', () => {
  const symbols = AVALANCHE_HOME.builderTypes.map((type) => renderResult(type.id).match(/<svg[^>]*data-symbol[^>]*>(.*?)<\/svg>/)![1])
  assert.equal(new Set(symbols).size, 4)
})

test('the path is called an exploration path, not a learning roadmap or curriculum', () => {
  assert.equal(BUILDER_RESULT_COPY.pathHeading, '추천 탐색 경로')
  assert.equal(BUILDER_RESULT_COPY.startCta, '나의 탐색 경로 시작하기')
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    assert.doesNotMatch(html, /학습 로드맵|나의 학습 경로|커리큘럼|이수 완료/, type.id)
    assert.match(html, /순서대로 이수하는 과정이 아니라/)
  }
})

test('bottom actions: a filled primary start button, and a quieter underlined restart link', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    assert.match(html, new RegExp(escapeRe(BUILDER_RESULT_COPY.startCta)))
    assert.match(html, /다시 테스트하기/)
    assert.doesNotMatch(html, /마지막 질문으로/)
    const primary = html.match(new RegExp('<button[^>]*>' + escapeRe(BUILDER_RESULT_COPY.startCta)))![0]
    const restart = html.match(/<button[^>]*>다시 테스트하기/)![0]
    assert.match(primary, /bg-\[var\(--editorial-accent\)\]/)
    assert.doesNotMatch(restart, /bg-\[var\(--editorial-accent\)\]/)
    assert.match(restart, /underline/)
  }
})

test('each type\'s path points at the documents and screens specified for it', () => {
  // (static markup cannot click — the click flow itself is covered by running the page in a browser)
  const target = (id: string) => typeOf(id).path.map((step) => step.target.id)
  assert.deepEqual(target('maker'), ['code-reference', 'mcp-tools', 'skill-library'])
  assert.deepEqual(target('analyst'), ['fundamentals', 'validator-structure'])
  assert.deepEqual(target('architect'), ['pcx-chains', 'official-docs'])
  assert.deepEqual(target('connector'), ['official-docs'])
})

test('external official docs appear only as a secondary reference that opens in a new tab', () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const html = renderResult(type.id)
    const roadmap = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'))
    // the main path is internal: buttons only, no anchors
    assert.doesNotMatch(roadmap, /<a /)
    // the primary CTA is an internal button
    assert.match(html, /<button[^>]*>나의 탐색 경로 시작하기/)
    if (!type.reference) {
      assert.doesNotMatch(html, new RegExp(escapeRe(BUILDER_RESULT_COPY.referenceHeading)))
      assert.doesNotMatch(html, /<a /)
      continue
    }
    const anchors = html.match(/<a [^>]*>/g) ?? []
    assert.equal(anchors.length, 1, type.id)
    assert.match(anchors[0], new RegExp(`href="${escapeRe(type.reference.url)}"`))
    assert.match(anchors[0], /target="_blank"/)
    assert.match(anchors[0], /rel="noopener noreferrer"/)
    assert.match(html, new RegExp(escapeRe(BUILDER_RESULT_COPY.referenceHeading)))
    assert.match(html, new RegExp(escapeRe(type.reference.label)))
    // the reference sits after the internal path and before the CTA
    assert.ok(html.indexOf('</ol>') < html.indexOf(type.reference.url))
    assert.ok(html.indexOf(type.reference.url) < html.indexOf('나의 탐색 경로 시작하기'))
  }
})
