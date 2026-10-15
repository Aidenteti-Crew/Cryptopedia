import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { AVALANCHE_HOME, getChainHomeContent, type HomeTarget } from "./avalanche-home"
import { CHAPTER_NAV, PRIMARY_NAV } from "./cryptopedia-taxonomy"

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../public/cryptopedia/${name}`, import.meta.url), "utf8"))

/* 홈이 연결하는 모든 대상은 실제로 존재해야 한다 — 없는 페이지로 보내지 않는다. */
const screenIds = new Set<string>([...PRIMARY_NAV, ...CHAPTER_NAV].map((item) => item.id))
const entryIds = new Set<string>()
for (const volume of read("collections.json")) for (const entry of volume.entries) entryIds.add(entry.id)
for (const article of read("articles.json")) entryIds.add(article.id)
const hub = read("hub.json")
for (const key of ["projects", "resources", "concepts", "skills", "cases"]) {
  for (const item of hub[key] ?? []) entryIds.add(item.id)
}

function assertExists(target: HomeTarget, where: string) {
  const known = target.kind === "screen" ? screenIds : entryIds
  assert.ok(known.has(target.id), `${where}: ${target.kind} "${target.id}" does not exist`)
}

test("every link on the home points to an existing screen or document", () => {
  for (const path of AVALANCHE_HOME.build) {
    for (const link of path.links) assertExists(link.target, `build/${path.id}`)
  }
  for (const item of AVALANCHE_HOME.learning) {
    assertExists({ kind: "screen", id: item.id }, `learning/${item.id}`)
  }
})

test("builder type results map to the four types and every reachable step exists", () => {
  assert.deepEqual(
    AVALANCHE_HOME.builderTypes.map((type) => type.id),
    ["maker", "analyst", "architect", "connector"],
  )
  assert.deepEqual(
    AVALANCHE_HOME.builderTypes.map((type) => type.label),
    ["THE MAKER", "THE ANALYST", "THE ARCHITECT", "THE CONNECTOR"],
  )
  for (const type of AVALANCHE_HOME.builderTypes) {
    assert.ok(type.path.length >= 1, `${type.id} has a path`)
    for (const step of type.path) assertExists(step.target, `type/${type.id}/${step.title}`)
  }
})

test("each type has three keywords, a 2–3 sentence description and a reason for its order", () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    assert.equal(type.keywords.length, 3, type.id)
    assert.equal(new Set(type.keywords.map((keyword) => keyword.term)).size, 3, `${type.id} keywords are distinct`)
    for (const keyword of type.keywords) assert.ok(keyword.note.trim().length > 0, `${type.id}/${keyword.term} has a note`)
    const sentences = (type.description.match(/[.?!](\s|$)/g) ?? []).length
    assert.ok(sentences >= 2 && sentences <= 3, `${type.id} description has ${sentences} sentences`)
    assert.ok(type.rationale.trim().length > 20, `${type.id} explains its roadmap order`)
    for (const step of type.path) assert.ok(step.description.trim().length > 0, `${type.id}/${step.title}`)
  }
  const maker = AVALANCHE_HOME.builderTypes.find((type) => type.id === "maker")!
  assert.deepEqual(
    maker.keywords.map((keyword) => [keyword.term, keyword.note]),
    [["실행", "아이디어를 바로 구현"], ["실험", "결과를 보며 개선"], ["도구 활용", "기존 도구를 조합해 개발"]],
  )
})

test("types differ in keywords, description and roadmap (same layout, different content)", () => {
  const types = AVALANCHE_HOME.builderTypes
  assert.equal(new Set(types.map((type) => type.description)).size, 4)
  assert.equal(new Set(types.map((type) => type.keywords.map((keyword) => keyword.term).join("|"))).size, 4)
  // the four roadmaps are all different sequences of steps
  assert.equal(new Set(types.map((type) => type.path.map((step) => step.title).join(">"))).size, 4)
})

test("architect and connector use only existing content, plus a secondary external reference", () => {
  const byId = Object.fromEntries(AVALANCHE_HOME.builderTypes.map((type) => [type.id, type]))
  const ids = (id: string) => byId[id].path.map((step) => step.target.id)
  // no new documents: every step is a pre-existing screen/document (existence is asserted above)
  assert.deepEqual(ids("architect"), ["structure", "official-docs"])
  assert.deepEqual(ids("connector"), ["official-docs"])
  assert.equal(new Set(AVALANCHE_HOME.builderTypes.map((type) => type.path.map((step) => step.target.id).join(">"))).size, 4)
  for (const id of ["l1-intro", "icm-intro"]) assert.ok(!entryIds.has(id), `${id} must not exist`)
})

test("external official docs are secondary references with verified canonical URLs, only where internal coverage is thin", () => {
  const byId = Object.fromEntries(AVALANCHE_HOME.builderTypes.map((type) => [type.id, type]))
  assert.equal(byId.maker.reference, undefined)
  assert.equal(byId.analyst.reference, undefined)
  // canonical addresses (checked: HTTP 200 with no redirect) — redirecting aliases are not used
  assert.deepEqual(byId.architect.reference, { label: "Avalanche L1 공식 문서", url: "https://build.avax.network/docs/avalanche-l1s" })
  assert.deepEqual(byId.connector.reference, {
    label: "Interchain Messaging 공식 문서",
    url: "https://build.avax.network/docs/cross-chain/avalanche-warp-messaging/overview",
  })
  for (const type of AVALANCHE_HOME.builderTypes) {
    if (!type.reference) continue
    const url = new URL(type.reference.url)
    assert.equal(url.protocol, "https:")
    assert.equal(url.host, "build.avax.network")
    // the primary path (and therefore the main CTA) is always internal
    assert.ok(type.path.length >= 1 && type.path[0].target)
  }
  // the rationale says honestly that dedicated material does not exist yet
  assert.match(byId.architect.rationale, /L1 전용 자료는 아직 없어서/)
  assert.match(byId.connector.rationale, /Interchain 전용 자료는 아직 없어서/)
})

test("top and bottom copy have different roles: who you are vs. why this content and where to start", () => {
  const maker = AVALANCHE_HOME.builderTypes.find((type) => type.id === "maker")!
  assert.equal(
    maker.description,
    "아이디어가 떠오르면 직접 실행하며 가능성을 확인하는 유형이에요. 완벽하게 이해한 뒤 시작하기보다 작은 결과를 만들고 개선하는 과정에서 배우는 걸 선호합니다.",
  )
  assert.equal(
    maker.rationale,
    "먼저 사용 가능한 개발 도구를 살펴보세요. 이후 에이전트 관련 자료와 스킬 라이브러리를 탐색하며 관심 있는 개발 방향을 구체화할 수 있습니다.",
  )
  for (const type of AVALANCHE_HOME.builderTypes) {
    // the top copy describes the person (…유형이에요 / 선호합니다), the bottom copy tells where to start (먼저 … 살펴보세요)
    assert.match(type.description, /유형이에요\./, type.id)
    assert.match(type.rationale, /^먼저 .*(살펴보세요|확인하세요)\./, type.id)
    // and they do not repeat each other: no sentence is shared
    const sentences = (text: string) => text.split(/(?<=[.?!])\s+/)
    const shared = sentences(type.description).filter((sentence) => sentences(type.rationale).includes(sentence))
    assert.deepEqual(shared, [], type.id)
  }
})

test("result copy never claims measured scores, percentages or charts", () => {
  for (const type of AVALANCHE_HOME.builderTypes) {
    const text = [type.name, type.description, type.rationale, ...type.keywords.flatMap((keyword) => [keyword.term, keyword.note]), ...type.path.map((step) => step.description)].join(" ")
    assert.doesNotMatch(text, /\d+\s*%|점수|퍼센트|레이더|차트|일치율/, type.id)
  }
})

test("home cards only claim what the site really has", () => {
  const card = (id: string) => AVALANCHE_HOME.build.find((path) => path.id === id)!
  // EVM card: the hub has Solidity / Foundry / viem reference items and no C-Chain content, so it must not claim any
  assert.match(card("evm").learn, /Solidity·Foundry·viem/)
  assert.doesNotMatch(card("evm").learn, /C-Chain|과정을 다룹니다/)
  assert.deepEqual(card("evm").links.map((link) => link.target.id), ["builders"])
  // L1 / Interchain: no dedicated material exists → say so and point to the existing official docs library
  for (const id of ["l1", "interchain"]) {
    assert.match(card(id).learn, /전용 학습 자료는 준비 중/)
    assert.deepEqual(card(id).links.map((link) => link.target.id), ["official-docs"])
  }
})

test("home content is registered for Avalanche only", () => {
  assert.equal(getChainHomeContent("avalanche"), AVALANCHE_HOME)
  assert.equal(getChainHomeContent("injective"), null)
})
