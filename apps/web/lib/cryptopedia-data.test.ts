import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

import {
  articleDetailSchema,
  bookDetailSchema,
  chainCollectionPageSchema,
  collectionPageSchema,
  collectionVolumeSchema,
  contentEntrySchema,
  ecosystemPageSchema,
  eventFeedResponseSchema,
  type EventEntry,
} from "./cryptopedia-types"
import {
  CryptopediaDataError,
  createStaticCryptopediaRepository,
} from "./cryptopedia-data"

const collection = {
  id: "fundamentals",
  breadcrumb: ["COLLECTION", "AVALANCHE", "FUNDAMENTALS"],
  volume: 1,
  eyebrow: "THE FUNDAMENTALS",
  title: "Avalanche",
  tagline: "하나의 체인, 깊이 있는 이해.",
  introduction: ["첫 개념부터 네트워크의 구조까지."],
  sectionTitle: "이 권의 목차",
  entries: [
    { id: "one", order: 1, title: "One", summary: "One", kind: "OVERVIEW" },
    { id: "two", order: 2, title: "Two", summary: "Two", kind: "ARCHITECTURE" },
    { id: "three", order: 3, title: "Three", summary: "Three", kind: "NETWORK" },
    { id: "four", order: 4, title: "Four", summary: "Four", kind: "GLOSSARY" },
  ],
}

const projects = [
  { id: "pengolin", name: "Pengolin", type: "PROJECT", volume: 5, description: "Project", href: "book-pengolin" },
  { id: "beam", name: "Beam", type: "CHAIN", volume: 2, description: "Chain", href: "book-beam" },
  { id: "avalanche", name: "Avalanche", type: "CHAIN", volume: 1, description: "C-Chain", href: "book-avalanche" },
  { id: "allblue", name: "All blue", type: "PROJECT", volume: 4, description: "Project", href: "book-allblue" },
  { id: "dexalot", name: "Dexalot", type: "CHAIN", volume: 3, description: "Avalanche L1", href: "book-dexalot" },
]

function event(overrides: Partial<EventEntry>): EventEntry {
  return {
    id: "event",
    title: "Event",
    summary: "Summary",
    startsAt: "2026-11-01T10:00:00+09:00",
    endsAt: null,
    timezone: "Asia/Seoul",
    allDay: false,
    status: "UPCOMING",
    organizer: null,
    venueName: null,
    venueAddress: null,
    city: null,
    country: null,
    isOnline: false,
    sourceUrl: null,
    registrationUrl: null,
    imageUrl: null,
    category: null,
    tags: [],
    chain: "Avalanche",
    project: null,
    publishedAt: null,
    fetchedAt: "2026-10-01T00:00:00+09:00",
    confidence: null,
    ...overrides,
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function fakeFetch(fixtures: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (!(url in fixtures)) return jsonResponse({ error: "missing fixture" }, 404)
    return jsonResponse(fixtures[url])
  }) as typeof fetch
}

test("loads collections and sorts project volumes", async () => {
  const repository = createStaticCryptopediaRepository(
    fakeFetch({
      "/cryptopedia/collections.json": [collection],
      "/cryptopedia/projects.json": projects,
    }),
  )

  const fundamentals = await repository.getCollection("fundamentals")
  const volumes = await repository.getProjects()

  assert.equal(fundamentals.entries.length, 4)
  assert.deepEqual(
    volumes.map((item) => item.name),
    ["Avalanche", "Beam", "Dexalot", "All blue", "Pengolin"],
  )
})

test("loads chain selection and ecosystem overview", async () => {
  const repository = createStaticCryptopediaRepository(
    fakeFetch({
      "/cryptopedia/chains.json": {
        breadcrumb: ["컬렉션", "탐색"],
        title: "체인 컬렉션",
        subtitle: "한 체인씩 깊이 읽는 블록체인 백과사전.",
        currentChainId: "avalanche",
        items: [{ id: "avalanche", order: 1, name: "Avalanche", summary: "체인 기초 · 빌더 · 아카데미 · 생태계", status: "AVAILABLE" }],
      },
      "/cryptopedia/ecosystem.json": {
        breadcrumb: ["COLLECTION", "AVALANCHE", "ECOSYSTEM"],
        eyebrow: "ECOSYSTEM INTELLIGENCE",
        title: "Avalanche",
        tagline: "생태계의 흐름을 한곳에서.",
        introduction: ["프로젝트, 기관 협업, 행사와 개발 업데이트."],
        entries: [
          { id: "projects", label: "PROJECT", title: "체인·프로젝트 서가", summary: "디지털 라이브러리" },
          { id: "macro", label: "MACRO", title: "매크로 소식", summary: "산업의 변화" },
          { id: "events", label: "EVENT", title: "행사 및 이벤트", summary: "생태계 행사" },
          { id: "updates", label: "DEV", title: "개발 업데이트", summary: "개발 변경 사항" },
        ],
        latest: [{ id: "latest-projects", order: 1, title: "생태계 프로젝트 살펴보기", summary: "프로젝트 · 예시 콘텐츠", kind: "PROJECT" }],
      },
    }),
  )

  assert.equal((await repository.getChains()).items[0].name, "Avalanche")
  assert.equal((await repository.getEcosystem()).entries[0].id, "projects")
})

test("returns event metadata and deterministic status ordering", async () => {
  const repository = createStaticCryptopediaRepository(
    fakeFetch({
      "/cryptopedia/events.json": {
        items: [
          event({ id: "past-old", status: "PAST", startsAt: "2026-08-01T10:00:00+09:00" }),
          event({ id: "upcoming-later", startsAt: "2026-12-01T10:00:00+09:00" }),
          event({ id: "past-new", status: "PAST", startsAt: "2026-09-01T10:00:00+09:00" }),
          event({ id: "upcoming-sooner", startsAt: "2026-11-01T10:00:00+09:00" }),
        ],
        nextCursor: "next-page",
        generatedAt: "2026-10-01T00:00:00+09:00",
      },
    }),
  )

  const feed = await repository.getEvents()

  assert.equal(feed.nextCursor, "next-page")
  assert.deepEqual(
    feed.items.map((item) => item.id),
    ["upcoming-sooner", "upcoming-later", "past-new", "past-old"],
  )
})

test("distinguishes network failures from validation failures", async () => {
  const networkRepository = createStaticCryptopediaRepository(
    (async () => jsonResponse({ error: "server" }, 500)) as typeof fetch,
  )
  await assert.rejects(
    networkRepository.getProjects(),
    (error: unknown) => error instanceof CryptopediaDataError && error.kind === "network",
  )

  const validationRepository = createStaticCryptopediaRepository(
    fakeFetch({ "/cryptopedia/projects.json": [{ id: "missing-fields" }] }),
  )
  await assert.rejects(
    validationRepository.getProjects(),
    (error: unknown) => error instanceof CryptopediaDataError && error.kind === "validation",
  )
})

test("all checked-in JSON files satisfy their runtime schemas", () => {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        fileURLToPath(new URL(`../public/cryptopedia/${name}`, import.meta.url)),
        "utf8",
      ),
    )

  collectionPageSchema.array().parse(read("collections.json"))
  chainCollectionPageSchema.parse(read("chains.json"))
  ecosystemPageSchema.parse(read("ecosystem.json"))
  collectionVolumeSchema.array().parse(read("projects.json"))
  contentEntrySchema.array().parse(read("macro.json"))
  eventFeedResponseSchema.parse(read("events.json"))
  contentEntrySchema.array().parse(read("updates.json"))
  articleDetailSchema.array().parse(read("articles.json"))
  bookDetailSchema.array().parse(read("books.json"))
})

test("every internal article and book link resolves", () => {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        fileURLToPath(new URL(`../public/cryptopedia/${name}`, import.meta.url)),
        "utf8",
      ),
    )
  const articles = articleDetailSchema.array().parse(read("articles.json"))
  const books = bookDetailSchema.array().parse(read("books.json"))
  const articleIds = new Set(articles.map((article) => article.id))
  const screenIds = new Set([
    "projects",
    "macro",
    "events",
    "updates",
    "fundamentals",
    "builders",
    "academy",
  ])

  for (const article of articles) {
    for (const related of article.relatedItems) {
      assert.ok(
        articleIds.has(related.id) || screenIds.has(related.id),
        `Unresolved related item: ${related.id}`,
      )
    }
    if (article.nextItemId) {
      assert.ok(
        articleIds.has(article.nextItemId) || screenIds.has(article.nextItemId),
        `Unresolved next item: ${article.nextItemId}`,
      )
    }
  }

  for (const book of books) {
    for (const chapter of book.chapters) {
      assert.ok(
        articleIds.has(chapter.id) || screenIds.has(chapter.id),
        `Unresolved book chapter: ${chapter.id}`,
      )
    }
  }
})
