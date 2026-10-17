import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

const page = readFileSync(
  fileURLToPath(new URL("../app/(chainery)/page.tsx", import.meta.url)),
  "utf8",
)

test("makes the root page a thin chainery entry", () => {
  assert.match(page, /EditorialApp/)
  // 제목은 루트 레이아웃의 chainery 기본값을 쓴다 — 예전 브랜드명이 남지 않게
  assert.doesNotMatch(page, /Cryptopedia/)
  assert.match(page, /모든 체인의 이야기가 모이는 곳, 체이너리\./)
  assert.doesNotMatch(page, /KaasCatalogPage/)
  assert.doesNotMatch(page, /function renderContent/)
})
