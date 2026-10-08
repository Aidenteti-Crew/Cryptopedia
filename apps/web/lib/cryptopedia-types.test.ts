import assert from "node:assert/strict"
import test from "node:test"

import {
  articleDetailSchema,
  chainCollectionPageSchema,
  collectionPageSchema,
  collectionVolumeSchema,
  ecosystemPageSchema,
  eventEntrySchema,
  eventFeedResponseSchema,
} from "./cryptopedia-types"

test("accepts the Figma collection data contract", () => {
  const value = collectionPageSchema.parse({
    id: "fundamentals",
    breadcrumb: ["COLLECTION", "AVALANCHE", "FUNDAMENTALS"],
    volume: 1,
    eyebrow: "THE FUNDAMENTALS",
    title: "Avalanche",
    tagline: "하나의 체인, 깊이 있는 이해.",
    introduction: ["첫 개념부터 네트워크의 구조까지."],
    sectionTitle: "이 권의 목차",
    entries: [
      {
        id: "overview",
        order: 1,
        title: "체인 개요",
        summary: "Avalanche의 시작과 네트워크의 핵심 개념",
        kind: "OVERVIEW",
      },
    ],
  })

  assert.equal(value.entries[0].kind, "OVERVIEW")
})

test("rejects an event without a stable id", () => {
  assert.throws(() =>
    eventEntrySchema.parse({
      title: "Crypto House Seoul '26",
      startsAt: "2026-09-28T14:00:00+09:00",
      status: "UPCOMING",
    }),
  )
})

test("accepts the mock event feed contract", () => {
  const feed = eventFeedResponseSchema.parse({
    items: [
      {
        id: "crypto-house-seoul-2026",
        title: "Crypto House Seoul '26",
        summary: "Avalanche 생태계 커뮤니티 행사",
        startsAt: "2026-09-28T14:00:00+09:00",
        endsAt: null,
        timezone: "Asia/Seoul",
        allDay: false,
        status: "UPCOMING",
        organizer: "Team1 Korea",
        venueName: "위워크 선릉 2호점",
        venueAddress: null,
        city: "Seoul",
        country: "KR",
        isOnline: false,
        sourceUrl: null,
        registrationUrl: null,
        imageUrl: null,
        category: "COMMUNITY",
        tags: ["Avalanche", "Community"],
        chain: "Avalanche",
        project: null,
        publishedAt: null,
        fetchedAt: "2026-09-01T00:00:00+09:00",
        confidence: null,
      },
    ],
    nextCursor: null,
    generatedAt: "2026-09-01T00:00:00+09:00",
  })

  assert.equal(feed.items.length, 1)
})

test("accepts chain and project volumes", () => {
  const volume = collectionVolumeSchema.parse({
    id: "avalanche",
    name: "Avalanche",
    type: "CHAIN",
    volume: 1,
    description: "C-Chain",
    href: "book-avalanche",
  })

  assert.equal(volume.type, "CHAIN")
})

test("requires article sections and related items arrays", () => {
  const article = articleDetailSchema.parse({
    id: "chain-overview",
    breadcrumb: ["체인 기초", "입문"],
    eyebrow: "개념 문서",
    title: "체인 개요",
    subtitle: "Avalanche를 이해하기 위한 첫 번째 문서.",
    sections: [],
    relatedItems: [],
  })

  assert.deepEqual(article.sections, [])
})

test("preserves Figma-specific document variants and modules", () => {
  const article = articleDetailSchema.parse({
    id: "code-reference",
    variant: "code",
    breadcrumb: ["빌더", "Code", "예제"],
    eyebrow: "빌더 / Code / 예제",
    title: "코드 레퍼런스",
    subtitle: "문맥과 함께 읽고, 직접 적용하는 빌더 예제.",
    sections: [],
    relatedItems: [],
    codeSample: {
      label: "JAVASCRIPT · 예제 구조",
      code: "console.log(lesson.topic);",
    },
    learningSteps: [],
    sourceInfo: [],
    actionLabel: "실습으로 이어가기 →",
    prototypeNote: "// 예제 구조 · UI 샘플",
  })

  assert.equal(article.variant, "code")
  assert.equal(article.codeSample?.label, "JAVASCRIPT · 예제 구조")
  assert.equal(article.actionLabel, "실습으로 이어가기 →")
})

test("accepts the Figma chain collection and ecosystem contracts", () => {
  const chains = chainCollectionPageSchema.parse({
    breadcrumb: ["컬렉션", "탐색"],
    title: "체인 컬렉션",
    subtitle: "한 체인씩 깊이 읽는 블록체인 백과사전.",
    currentChainId: "avalanche",
    items: [
      { id: "avalanche", order: 1, name: "Avalanche", summary: "체인 기초 · 빌더 · 아카데미 · 생태계", status: "AVAILABLE" },
      { id: "injective", order: 2, name: "Injective", summary: "컬렉션 준비 중", status: "COMING_SOON" },
    ],
  })
  assert.equal(chains.items[1].status, "COMING_SOON")

  const ecosystem = ecosystemPageSchema.parse({
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
  })
  assert.equal(ecosystem.entries[0].id, "projects")
})
