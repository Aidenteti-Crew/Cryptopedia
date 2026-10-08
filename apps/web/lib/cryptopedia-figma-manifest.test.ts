import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

import { FIGMA_SCREEN_MANIFEST } from "./cryptopedia-figma-manifest"
import { articleDetailSchema, bookDetailSchema } from "./cryptopedia-types"

const EXPECTED_FAMILIES = [
  "fundamentals",
  "builders",
  "academy",
  "ecosystem",
  "reader",
  "architecture",
  "validator",
  "glossary",
  "docs",
  "code",
  "protocol",
  "course",
  "lesson",
  "graph",
  "chains",
  "article",
  "projects",
  "macro",
  "events",
  "updates",
  "macro-detail",
  "event-archive",
  "book-avalanche",
  "book-beam",
  "book-dexalot",
  "book-allblue",
  "book-pengolin",
] as const

test("tracks every Full Service Figma screen family", () => {
  assert.deepEqual(
    FIGMA_SCREEN_MANIFEST.map((screen) => screen.family),
    EXPECTED_FAMILIES,
  )
  assert.equal(FIGMA_SCREEN_MANIFEST.length, 27)
})

test("maps desktop, tablet, and mobile nodes for every family", () => {
  for (const screen of FIGMA_SCREEN_MANIFEST) {
    assert.match(screen.nodes.desktop, /^\d+:\d+$/)
    assert.match(screen.nodes.tablet, /^\d+:\d+$/)
    assert.match(screen.nodes.mobile, /^\d+:\d+$/)
  }
})

test("has no omitted or simplified screen family", () => {
  const incomplete = FIGMA_SCREEN_MANIFEST.filter(
    (screen) => screen.status !== "complete",
  )
  assert.deepEqual(
    incomplete.map((screen) => `${screen.family}:${screen.status}`),
    [],
  )
})

test("provides data for every detail and book family", () => {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        fileURLToPath(new URL(`../public/cryptopedia/${name}`, import.meta.url)),
        "utf8",
      ),
    )
  const articles = articleDetailSchema.array().parse(read("articles.json"))
  const variants = new Set(articles.map((article) => article.variant))
  assert.deepEqual(
    [...variants].sort(),
    [
      "architecture",
      "article",
      "code",
      "course",
      "docs",
      "glossary",
      "graph",
      "lesson",
      "macro",
      "protocol",
      "reader",
      "validator",
    ],
  )

  const books = bookDetailSchema.array().parse(read("books.json"))
  assert.deepEqual(
    books.map((book) => book.id),
    ["book-avalanche", "book-beam", "book-dexalot", "book-allblue", "book-pengolin"],
  )
  assert.ok(books.every((book) => Boolean(book.coverAsset)))
})
