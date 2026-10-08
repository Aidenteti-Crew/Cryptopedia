import assert from "node:assert/strict"
import test from "node:test"

import {
  getEditorialViewKey,
  editorialViewReducer,
  type EditorialView,
} from "./editorial-app"

test("creates a stable transition key for every view kind", () => {
  assert.equal(
    getEditorialViewKey({ kind: "screen", id: "ecosystem" }),
    "screen:ecosystem",
  )
  assert.equal(
    getEditorialViewKey({
      kind: "article",
      id: "chain-overview",
      parent: "fundamentals",
    }),
    "article:chain-overview",
  )
  assert.equal(
    getEditorialViewKey({
      kind: "book",
      id: "book-avalanche",
      parent: "projects",
    }),
    "book:book-avalanche",
  )
})

test("opens a detail with its parent and returns to that parent", () => {
  const start: EditorialView = { kind: "screen", id: "fundamentals" }
  const detail = editorialViewReducer(start, {
    type: "open-article",
    id: "chain-overview",
    parent: "fundamentals",
  })

  assert.deepEqual(detail, {
    kind: "article",
    id: "chain-overview",
    parent: "fundamentals",
  })
  assert.deepEqual(editorialViewReducer(detail, { type: "back" }), start)
})

test("books always return to projects", () => {
  const book = editorialViewReducer(
    { kind: "screen", id: "projects" },
    { type: "open-book", id: "book-avalanche" },
  )

  assert.deepEqual(book, {
    kind: "book",
    id: "book-avalanche",
    parent: "projects",
  })
  assert.deepEqual(editorialViewReducer(book, { type: "back" }), {
    kind: "screen",
    id: "projects",
  })
})

test("selecting navigation replaces a detail view", () => {
  const detail: EditorialView = {
    kind: "article",
    id: "chain-overview",
    parent: "fundamentals",
  }

  assert.deepEqual(
    editorialViewReducer(detail, { type: "select-screen", id: "events" }),
    { kind: "screen", id: "events" },
  )
})
