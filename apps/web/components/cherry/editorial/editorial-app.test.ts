import assert from "node:assert/strict"
import test from "node:test"

import {
  getEditorialViewKey,
  editorialViewReducer,
  loadEditorialView,
  type EditorialView,
} from "./editorial-app"
import type { CryptopediaRepository } from '@/lib/cryptopedia-data'

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

test("restores the actual previous library or case when returning from a connected detail", () => {
  const previous: EditorialView = { kind: "article", id: "practice", parent: "academy" }
  const detail: EditorialView = { kind: "article", id: "case-first-contract", parent: "academy" }
  assert.deepEqual(editorialViewReducer(detail, { type: "restore-view", view: previous }), previous)
})

test('ecosystem subpages load the selected chain from live repository methods', async () => {
  const calls: string[] = []
  const repository = {
    getEcosystemProjects: async (chain: string) => { calls.push(`projects:${chain}`); return { items: [], categories: [], total: 0, generatedAt: '2026-10-14T00:00:00Z' } },
    getMacroArticles: async (chain: string) => { calls.push(`macro:${chain}`); return [] },
    getEvents: async (chain: string, status?: string) => { calls.push(`events:${chain}:${status ?? 'all'}`); return { items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' } },
    getUpdates: async (chain: string) => { calls.push(`updates:${chain}`); return [] },
  } as unknown as CryptopediaRepository

  for (const id of ['projects', 'macro', 'events', 'event-archive', 'updates'] as const) {
    await loadEditorialView({ kind: 'screen', id }, repository, 'avalanche')
  }
  assert.deepEqual(calls, [
    'projects:avalanche', 'macro:avalanche', 'events:avalanche:all',
    'events:avalanche:past', 'updates:avalanche',
  ])
})

test('ecosystem home loads project categories without making the news feed depend on them', async () => {
  const projectData = { items: [], categories: [{ name: 'DeFi', count: 2 }], total: 2, generatedAt: '2026-10-14T00:00:00Z' }
  const repository = {
    getEcosystem: async () => ({ latest: [] }),
    getHub: async () => ({}),
    getEcosystemProjects: async () => projectData,
  } as unknown as CryptopediaRepository
  const loaded = await loadEditorialView({ kind: 'screen', id: 'ecosystem' }, repository, 'avalanche')
  assert.equal(loaded.kind, 'ecosystem')
  if (loaded.kind !== 'ecosystem') return
  assert.deepEqual(loaded.projects, projectData)

  const offlineProjects = {
    ...repository,
    getEcosystemProjects: async () => { throw new Error('project feed unavailable') },
  } as CryptopediaRepository
  const withoutProjects = await loadEditorialView({ kind: 'screen', id: 'ecosystem' }, offlineProjects, 'avalanche')
  assert.equal(withoutProjects.kind, 'ecosystem')
  if (withoutProjects.kind === 'ecosystem') assert.equal(withoutProjects.projects, null)
})
