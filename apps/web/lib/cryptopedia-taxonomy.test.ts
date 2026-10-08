import assert from "node:assert/strict"
import test from "node:test"

import {
  CHAPTER_NAV,
  DEFAULT_SCREEN_ID,
  PRIMARY_NAV,
  resolveParentScreen,
} from "./cryptopedia-taxonomy"

test("puts the ecosystem collection first", () => {
  assert.equal(DEFAULT_SCREEN_ID, "ecosystem")
  assert.deepEqual(
    PRIMARY_NAV.map((item) => item.id),
    ["projects", "macro", "events", "updates"],
  )
})

test("includes dedicated chain selection and ecosystem screens", () => {
  assert.equal(resolveParentScreen("institutional-collaboration"), "macro")
  assert.equal(resolveParentScreen("chain-overview"), "fundamentals")
})

test("keeps the Figma chapter order", () => {
  assert.deepEqual(
    CHAPTER_NAV.map((item) => item.id),
    ["fundamentals", "builders", "academy"],
  )
})

test("resolves article ids to their parent screens", () => {
  assert.equal(resolveParentScreen("chain-overview"), "fundamentals")
  assert.equal(resolveParentScreen("fuji-update"), "updates")
  assert.equal(resolveParentScreen("unknown-entry"), null)
})
