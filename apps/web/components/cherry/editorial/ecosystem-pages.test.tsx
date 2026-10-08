import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type {
  CollectionVolume,
  ContentEntry,
  EventEntry,
} from "@/lib/cryptopedia-types"

import { EventsPage } from "./events-page"
import { FeedPage } from "./feed-page"
import { ProjectsPage } from "./projects-page"

const volumes: CollectionVolume[] = [
  { id: "avalanche", name: "Avalanche", type: "CHAIN", volume: 1, networkType: "C-CHAIN", description: "Chain", coverAsset: "/cryptopedia/assets/book-avalanche.png", href: "book-avalanche" },
  { id: "allblue", name: "All blue", type: "PROJECT", volume: 4, networkType: "PROJECT COLLECTION", description: "Project", coverAsset: "/cryptopedia/assets/book-allblue.png", href: "book-allblue" },
]

const entries: ContentEntry[] = [
  { id: "institutional", order: 1, title: "금융기관 협업 소식", summary: "발표 요약", kind: "MACRO" },
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

test("separates chain and project collections", () => {
  const html = renderToStaticMarkup(
    <ProjectsPage volumes={volumes} onOpenBook={() => undefined} />,
  )

  assert.match(html, /CHAIN COLLECTION/)
  assert.match(html, /PROJECT COLLECTION/)
  assert.match(html, /Avalanche/)
  assert.match(html, /All blue/)
  assert.match(html, /book-avalanche\.png/)
})

test("renders feed filters as descriptive copy and entries as actions", () => {
  const html = renderToStaticMarkup(
    <FeedPage
      eyebrow="매크로 브리핑 / 예시 콘텐츠"
      title="매크로 소식"
      introduction="금융기관 협업과 산업의 변화를 출처와 함께 읽습니다."
      filters={["전체 소식", "기관 협업", "산업 동향"]}
      entries={entries}
      onOpenEntry={() => undefined}
    />,
  )

  assert.match(html, /전체 소식 · 기관 협업 · 산업 동향/)
  assert.match(html, /최신 등록순/)
  assert.match(html, /금융기관 협업 소식/)
  assert.doesNotMatch(html, /editorial-display[^>]*>매크로 소식/)
})

test("renders scheduled, past, and changed event groups", () => {
  const html = renderToStaticMarkup(
    <EventsPage
      events={[
        event({ id: "upcoming", title: "Upcoming" }),
        event({ id: "past", title: "Past", status: "PAST" }),
        event({ id: "cancelled", title: "Cancelled", status: "CANCELLED" }),
      ]}
      onOpenArchive={() => undefined}
    />,
  )

  assert.match(html, /예정된 이벤트/)
  assert.match(html, /지난 이벤트/)
  assert.match(html, /일정 변경/)
  assert.match(html, /장소 정보 없음/)
  assert.doesNotMatch(html, /href="null"/)
  assert.doesNotMatch(html, /editorial-display[^>]*>행사 및 이벤트/)
  assert.match(html, /전체 보기 →/)
})

test("renders the dedicated Figma event archive copy", () => {
  const html = renderToStaticMarkup(
    <EventsPage
      archiveMode
      events={[event({ id: "past", title: "Past", status: "PAST" })]}
    />,
  )

  assert.match(html, /← 행사 및 이벤트/)
  assert.match(html, />지난 이벤트</)
  assert.match(html, /종료된 행사와 커뮤니티의 기록을 모았습니다/)
  assert.match(html, /2026년 9월 · 종료일 최신순/)
  assert.doesNotMatch(html, /다가오는 만남부터/)
})
