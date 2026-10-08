import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type {
  ChainCollectionPageData,
  EcosystemPageData,
} from "@/lib/cryptopedia-types"

import { ChainCollectionPage } from "./chain-collection-page"
import { EcosystemPage } from "./ecosystem-page"

const chains: ChainCollectionPageData = {
  breadcrumb: ["컬렉션", "탐색"],
  title: "체인 컬렉션",
  subtitle: "한 체인씩 깊이 읽는 블록체인 백과사전.",
  currentChainId: "avalanche",
  items: [
    { id: "avalanche", order: 1, name: "Avalanche", summary: "체인 기초 · 빌더 · 아카데미 · 생태계", status: "AVAILABLE" },
    { id: "injective", order: 2, name: "Injective", summary: "컬렉션 준비 중", status: "COMING_SOON" },
    { id: "midnight", order: 3, name: "Midnight", summary: "컬렉션 준비 중", status: "COMING_SOON" },
  ],
}

const ecosystem: EcosystemPageData = {
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
  latest: [
    { id: "projects", order: 1, title: "생태계 프로젝트 살펴보기", summary: "프로젝트 · 예시 콘텐츠", kind: "PROJECT" },
  ],
}

test("renders the Figma chain collection selection screen", () => {
  const html = renderToStaticMarkup(
    <ChainCollectionPage
      data={chains}
      onBack={() => undefined}
      onOpenChain={() => undefined}
    />,
  )

  assert.match(html, /체인 컬렉션/)
  assert.match(html, /한 체인씩 깊이 읽는 블록체인 백과사전/)
  assert.match(html, /Avalanche 열기 →/)
  assert.match(html, /Injective/)
  assert.match(html, /Midnight/)
  assert.match(html, /disabled=""/)
})

test("renders the ecosystem overview and latest signals", () => {
  const html = renderToStaticMarkup(
    <EcosystemPage
      data={ecosystem}
      onOpenScreen={() => undefined}
      onOpenLatest={() => undefined}
    />,
  )

  assert.match(html, /ECOSYSTEM INTELLIGENCE/)
  assert.match(html, /생태계의 흐름을 한곳에서/)
  assert.match(html, /체인·프로젝트 서가/)
  assert.match(html, /최근 수집 소식/)
  assert.match(html, /생태계 프로젝트 살펴보기/)
  assert.match(html, /출처에서 시작하는 생태계 탐색/)
})
