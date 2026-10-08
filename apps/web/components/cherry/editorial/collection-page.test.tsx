import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { CollectionPageData } from "@/lib/cryptopedia-types"

import { CollectionPage } from "./collection-page"
import {
  EditorialEmpty,
  EditorialError,
  EditorialLoading,
} from "./editorial-states"

const data: CollectionPageData = {
  id: "fundamentals",
  breadcrumb: ["COLLECTION", "AVALANCHE", "FUNDAMENTALS"],
  volume: 1,
  eyebrow: "THE FUNDAMENTALS",
  title: "Avalanche",
  tagline: "하나의 체인, 깊이 있는 이해.",
  introduction: [
    "첫 개념부터 네트워크의 구조까지.",
    "흩어진 지식을 연결해, 다음 빌드의 토대를 만듭니다.",
  ],
  sectionTitle: "이 권의 목차",
  entries: [
    { id: "overview", order: 1, title: "체인 개요", summary: "첫 개념", kind: "OVERVIEW" },
    { id: "architecture", order: 2, title: "P · C · X 체인", summary: "구조", kind: "ARCHITECTURE" },
  ],
}

test("renders collection copy and numbered entries from data", () => {
  const html = renderToStaticMarkup(
    <CollectionPage data={data} onOpenEntry={() => undefined} />,
  )

  assert.match(html, /COLLECTION\s+\/\s+AVALANCHE\s+\/\s+FUNDAMENTALS/)
  assert.match(html, /VOLUME 01/)
  assert.match(html, /Avalanche/)
  assert.match(html, /이 권의 목차/)
  assert.match(html, /02/)
  assert.match(html, /체인 개요/)
  assert.match(html, /P · C · X 체인/)
  assert.match(html, /OVERVIEW/)
})

test("renders explicit loading, empty, and error states", () => {
  assert.match(renderToStaticMarkup(<EditorialLoading />), /자료를 불러오는 중/)
  assert.match(
    renderToStaticMarkup(<EditorialEmpty message="등록된 자료가 없습니다." />),
    /등록된 자료가 없습니다/,
  )
  const errorHtml = renderToStaticMarkup(
    <EditorialError message="자료를 불러오지 못했습니다." onRetry={() => undefined} />,
  )
  assert.match(errorHtml, /자료를 불러오지 못했습니다/)
  assert.match(errorHtml, /다시 시도/)
})
