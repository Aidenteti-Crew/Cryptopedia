import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { ArticleDetail, BookDetail } from "@/lib/cryptopedia-types"

import { ArticleReader } from "./article-reader"
import { BookDetailPage } from "./book-detail-page"

const article: ArticleDetail = {
  id: "chain-overview",
  breadcrumb: ["체인 기초", "입문", "개념 문서"],
  eyebrow: "체인 기초 / 입문 / 개념 문서",
  title: "체인 개요",
  subtitle: "Avalanche를 이해하기 위한 첫 번째 문서.",
  quickSummary: "네트워크의 목적부터 순서대로 읽어보세요.",
  sections: [
    { id: "coverage", heading: "이 문서에서 다루는 내용", body: "네트워크의 기본 개념을 살펴봅니다." },
  ],
  relatedItems: [
    { id: "pcx-chains", order: 1, title: "P · C · X 체인", summary: "구조", kind: "ARCHITECTURE" },
  ],
  officialUrl: "https://example.com/docs",
  nextItemId: "pcx-chains",
}

const book: BookDetail = {
  id: "book-avalanche",
  name: "Avalanche",
  type: "CHAIN",
  volume: 1,
  networkType: "C-CHAIN",
  description: "Primary Network · C-Chain",
  readingGuide: "체인을 이해하고 최신 소식을 연결해서 읽습니다.",
  contentStatus: "컬렉션 구성 미리보기",
  coverAsset: "/cryptopedia/assets/book-avalanche.png",
  chapters: [
    { id: "chain-overview", order: 1, title: "소개와 공식 자료", summary: "개념 · 공식 사이트 · Docs", kind: "OVERVIEW" },
  ],
}

test("renders article sections, related entries, and safe official link", () => {
  const html = renderToStaticMarkup(
    <ArticleReader
      article={article}
      onBack={() => undefined}
      onOpenRelated={() => undefined}
    />,
  )

  assert.match(html, /← 목록으로 돌아가기/)
  assert.match(html, /체인 개요/)
  assert.match(html, /이 문서에서 다루는 내용/)
  assert.match(html, /P · C · X 체인/)
  assert.match(html, /rel="noopener noreferrer"/)
  assert.doesNotMatch(html, /editorial-display[^>]*>체인 개요/)
})

test("renders book identity and chapters through one template", () => {
  const html = renderToStaticMarkup(
    <BookDetailPage
      book={book}
      onBack={() => undefined}
      onOpenChapter={() => undefined}
    />,
  )

  assert.match(html, /CHAIN COLLECTION \/ VOL. 01/)
  assert.match(html, /Avalanche/)
  assert.match(html, /C-Chain/)
  assert.match(html, /이 책의 목차/)
  assert.match(html, /소개와 공식 자료/)
  assert.match(html, /book-avalanche\.png/)
  assert.doesNotMatch(html, /editorial-display[^>]*>이 책의 목차/)
})

test("renders code, learning map, and source modules from Figma variants", () => {
  const codeHtml = renderToStaticMarkup(
    <ArticleReader
      article={{
        ...article,
        variant: "code",
        codeSample: { label: "JAVASCRIPT · 예제 구조", code: "console.log(lesson.topic);" },
        actionLabel: "실습으로 이어가기 →",
        prototypeNote: "// 예제 구조 · UI 샘플",
      }}
      onBack={() => undefined}
      onOpenRelated={() => undefined}
    />,
  )
  assert.match(codeHtml, /JAVASCRIPT · 예제 구조/)
  assert.match(codeHtml, /console\.log\(lesson\.topic\)/)

  const graphHtml = renderToStaticMarkup(
    <ArticleReader
      article={{
        ...article,
        variant: "graph",
        learningSteps: [
          { id: "foundation", order: 1, title: "체인 기초", summary: "핵심 개념", kind: "FOUNDATION" },
        ],
        relatedItems: [
          { id: "chain-overview", title: "개념 · 체인 기초", summary: "시작점", kind: "FOUNDATION" },
        ],
      }}
      onBack={() => undefined}
      onOpenRelated={() => undefined}
    />,
  )
  assert.match(graphHtml, /FOUNDATION → UNDERSTAND → BUILD/)
  assert.doesNotMatch(graphHtml, />00</)

  const sourceHtml = renderToStaticMarkup(
    <ArticleReader
      article={{ ...article, variant: "docs", sourceInfo: ["출처: Avalanche Builder Hub", "원문: build.avax.network"] }}
      onBack={() => undefined}
      onOpenRelated={() => undefined}
    />,
  )
  assert.match(sourceHtml, /출처: Avalanche Builder Hub/)
})
