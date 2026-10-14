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
  assert.match(globals, /--editorial-paper:\s*#F1EEEE/i)
  assert.match(globals, /--editorial-surface:\s*#FAF8FA/i)
  assert.match(globals, /--editorial-ink:\s*#29252D/i)
  assert.match(globals, /--editorial-muted:\s*#77717C/i)
  assert.match(globals, /--editorial-accent:\s*#76519B/i)
  assert.match(globals, /--editorial-deep:\s*#211629/i)
  assert.match(globals, /--editorial-active:\s*#E9E0F1/i)
  assert.match(globals, /--editorial-hover:\s*#EDE7F0/i)
  assert.match(globals, /--editorial-line:\s*#E6E0E8/i)
})

test("stores the complete Figma seal export as a non-empty PNG", () => {
  const seal = readFileSync(
    fromLib("../public/cryptopedia/assets/aidenteti-seal.png"),
  )

  assert.ok(seal.length > 0)
  assert.deepEqual([...seal.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
})
