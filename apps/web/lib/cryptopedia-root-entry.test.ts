import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

const page = readFileSync(
  fileURLToPath(new URL("../app/page.tsx", import.meta.url)),
  "utf8",
)

test("makes the root page a thin Cryptopedia entry", () => {
  assert.match(page, /EditorialApp/)
  assert.match(page, /Cryptopedia — The Blockchain Encyclopedia/)
  assert.match(page, /Avalanche knowledge, connected\./)
  assert.doesNotMatch(page, /KaasCatalogPage/)
  assert.doesNotMatch(page, /function renderContent/)
})
