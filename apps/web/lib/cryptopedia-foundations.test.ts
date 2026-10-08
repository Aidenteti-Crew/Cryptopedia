import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

const fromLib = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const layout = readFileSync(fromLib("../app/layout.tsx"), "utf8")
const globals = readFileSync(fromLib("../app/globals.css"), "utf8")

test("loads the exact Figma font families without removing existing fonts", () => {
  assert.match(layout, /Cormorant/)
  assert.match(layout, /Noto_Sans_KR/)
  assert.match(layout, /--font-editorial-display/)
  assert.match(layout, /--font-editorial-body/)
  assert.match(layout, /--font-inter/)
  assert.match(layout, /--font-rounded/)
})

test("scopes the exact Figma variables to the editorial root", () => {
  assert.match(globals, /\.editorial-root\s*\{/)
  assert.match(globals, /--editorial-paper:\s*#151a20/)
  assert.match(globals, /--editorial-surface:\s*#101419/)
  assert.match(globals, /--editorial-ink:\s*#e9edf2/)
  assert.match(globals, /--editorial-muted:\s*#a5afbb/)
  assert.match(globals, /--editorial-accent:\s*#cebd91/)
  assert.match(globals, /--editorial-line:\s*#323c48/)
})

test("stores the complete Figma seal export as a non-empty PNG", () => {
  const seal = readFileSync(
    fromLib("../public/cryptopedia/assets/aidenteti-seal.png"),
  )

  assert.ok(seal.length > 0)
  assert.deepEqual([...seal.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
})
