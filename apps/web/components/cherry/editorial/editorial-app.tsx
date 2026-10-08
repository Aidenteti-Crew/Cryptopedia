"use client"

import { useEffect, useReducer, useState } from "react"

import {
  createStaticCryptopediaRepository,
  type CryptopediaRepository,
} from "@/lib/cryptopedia-data"
import {
  CHAPTER_NAV,
  DEFAULT_SCREEN_ID,
  PRIMARY_NAV,
  resolveParentScreen,
  type ScreenId,
} from "@/lib/cryptopedia-taxonomy"
import type {
  ArticleDetail,
  BookDetail,
  ChainCollectionPageData,
  CollectionPageData,
  CollectionVolume,
  ContentEntry,
  EventFeedResponse,
  EcosystemPageData,
} from "@/lib/cryptopedia-types"

import { ArticleReader } from "./article-reader"
import { BookDetailPage } from "./book-detail-page"
import { ChainCollectionPage } from "./chain-collection-page"
import { CollectionPage } from "./collection-page"
import { EditorialError, EditorialLoading } from "./editorial-states"
import { EditorialPageTransition } from "./editorial-page-transition"
import { EditorialShell } from "./editorial-shell"
import { EcosystemPage } from "./ecosystem-page"
import { EventsPage } from "./events-page"
import { FeedPage } from "./feed-page"
import { ProjectsPage } from "./projects-page"

export type EditorialView =
  | { kind: "screen"; id: ScreenId }
  | { kind: "article"; id: string; parent: ScreenId }
  | { kind: "book"; id: string; parent: "projects" }

export type EditorialViewAction =
  | { type: "select-screen"; id: ScreenId }
  | { type: "open-article"; id: string; parent: ScreenId }
  | { type: "open-book"; id: string }
  | { type: "back" }

export function getEditorialViewKey(view: EditorialView) {
  return `${view.kind}:${view.id}`
}

export function editorialViewReducer(
  view: EditorialView,
  action: EditorialViewAction,
): EditorialView {
  switch (action.type) {
    case "select-screen":
      return { kind: "screen", id: action.id }
    case "open-article":
      return {
        kind: "article",
        id: action.id,
        parent: action.parent,
      }
    case "open-book":
      return { kind: "book", id: action.id, parent: "projects" }
    case "back":
      return view.kind === "screen"
        ? view
        : { kind: "screen", id: view.parent }
  }
}

type LoadedView =
  | { kind: "chains"; data: ChainCollectionPageData }
  | { kind: "ecosystem"; data: EcosystemPageData }
  | { kind: "collection"; data: CollectionPageData }
  | { kind: "projects"; data: CollectionVolume[] }
  | { kind: "macro"; data: ContentEntry[] }
  | { kind: "events"; screen: "events" | "event-archive"; data: EventFeedResponse }
  | { kind: "updates"; data: ContentEntry[] }
  | { kind: "article"; data: ArticleDetail }
  | { kind: "book"; data: BookDetail }

type LoadState =
  | { status: "loading" }
  | { status: "ready"; view: LoadedView }
  | { status: "error"; message: string }

const repository = createStaticCryptopediaRepository()

const NAV_SCREEN_IDS = new Set<ScreenId>([
  ...PRIMARY_NAV.map((item) => item.id),
  ...CHAPTER_NAV.map((item) => item.id),
  "event-archive",
  "chains",
  "ecosystem",
])

async function loadEditorialView(
  view: EditorialView,
  data: CryptopediaRepository,
): Promise<LoadedView> {
  if (view.kind === "article") {
    return { kind: "article", data: await data.getArticle(view.id) }
  }
  if (view.kind === "book") {
    return { kind: "book", data: await data.getBook(view.id) }
  }

  switch (view.id) {
    case "chains":
      return { kind: "chains", data: await data.getChains() }
    case "ecosystem":
      return { kind: "ecosystem", data: await data.getEcosystem() }
    case "fundamentals":
    case "builders":
    case "academy":
      return { kind: "collection", data: await data.getCollection(view.id) }
    case "projects":
      return { kind: "projects", data: await data.getProjects() }
    case "macro":
      return { kind: "macro", data: await data.getMacroArticles() }
    case "events":
    case "event-archive":
      return { kind: "events", screen: view.id, data: await data.getEvents() }
    case "updates":
      return { kind: "updates", data: await data.getUpdates() }
    case "article":
    case "book":
      throw new Error(`Invalid top-level screen: ${view.id}`)
  }
}

export function EditorialApp() {
  const [view, dispatch] = useReducer(editorialViewReducer, {
    kind: "screen",
    id: DEFAULT_SCREEN_ID,
  })
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" })
  const [retryVersion, setRetryVersion] = useState(0)
  const [activeChain, setActiveChain] = useState({
    id: "avalanche",
    name: "Avalanche",
  })

  const activeScreen = view.kind === "screen" ? view.id : view.parent
  const transitionKey = getEditorialViewKey(view)

  useEffect(() => {
    let cancelled = false
    setLoadState({ status: "loading" })

    loadEditorialView(view, repository)
      .then((loaded) => {
        if (!cancelled) setLoadState({ status: "ready", view: loaded })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message =
          error instanceof Error
            ? error.message
            : "자료를 불러오지 못했습니다."
        setLoadState({ status: "error", message })
      })

    window.scrollTo({ top: 0, behavior: "auto" })
    return () => {
      cancelled = true
    }
  }, [view, retryVersion])

  const selectScreen = (id: ScreenId) => {
    dispatch({ type: "select-screen", id })
  }

  const openArticle = (id: string, fallbackParent = activeScreen) => {
    if (NAV_SCREEN_IDS.has(id as ScreenId)) {
      selectScreen(id as ScreenId)
      return
    }
    dispatch({
      type: "open-article",
      id,
      parent: resolveParentScreen(id) ?? fallbackParent,
    })
  }

  let content
  if (loadState.status === "loading") {
    content = <EditorialLoading />
  } else if (loadState.status === "error") {
    content = (
      <EditorialError
        message={loadState.message}
        onRetry={() => setRetryVersion((version) => version + 1)}
      />
    )
  } else {
    const loaded = loadState.view
    switch (loaded.kind) {
      case "chains":
        content = (
          <ChainCollectionPage
            data={loaded.data}
            onBack={() => selectScreen("ecosystem")}
            onOpenChain={(id) => {
              const chain = loaded.data.items.find((item) => item.id === id)
              if (!chain || chain.status !== "AVAILABLE") return
              setActiveChain({ id: chain.id, name: chain.name })
              selectScreen("ecosystem")
            }}
          />
        )
        break
      case "ecosystem":
        content = (
          <EcosystemPage
            data={loaded.data}
            onOpenScreen={selectScreen}
            onOpenLatest={(id) => openArticle(id, "ecosystem")}
          />
        )
        break
      case "collection":
        content = (
          <CollectionPage
            data={loaded.data}
            onOpenEntry={(id) => openArticle(id, activeScreen)}
          />
        )
        break
      case "projects":
        content = (
          <ProjectsPage
            volumes={loaded.data}
            onOpenBook={(id) => dispatch({ type: "open-book", id })}
          />
        )
        break
      case "macro":
        content = (
          <FeedPage
            eyebrow="매크로 브리핑 / 예시 콘텐츠"
            title="매크로 소식"
            introduction="금융기관 협업과 산업의 변화를 출처와 함께 읽습니다."
            filters={["전체 소식", "기관 협업", "산업 동향"]}
            entries={loaded.data}
            onOpenEntry={(id) => openArticle(id, "macro")}
          />
        )
        break
      case "events":
        content = (
          <EventsPage
            events={loaded.data.items}
            archiveMode={loaded.screen === "event-archive"}
            onOpenArchive={
              loaded.screen === "events"
                ? () => selectScreen("event-archive")
                : undefined
            }
          />
        )
        break
      case "updates":
        content = (
          <FeedPage
            eyebrow="개발 릴리스 / 예시 콘텐츠"
            title="개발 업데이트"
            introduction="네트워크와 개발 도구의 변경 사항을 빠르게 확인하세요."
            filters={["전체 릴리스", "네트워크", "테스트넷", "도구"]}
            entries={loaded.data}
            onOpenEntry={(id) => openArticle(id, "updates")}
          />
        )
        break
      case "article":
        content = (
          <ArticleReader
            article={loaded.data}
            onBack={() => dispatch({ type: "back" })}
            onOpenRelated={(id) => openArticle(id, activeScreen)}
          />
        )
        break
      case "book":
        content = (
          <BookDetailPage
            book={loaded.data}
            onBack={() => dispatch({ type: "back" })}
            onOpenChapter={(id) => openArticle(id, "projects")}
          />
        )
        break
    }
  }

  return (
    <EditorialShell
      activeScreen={activeScreen}
      activeChainName={activeChain.name}
      onSelect={selectScreen}
    >
      <EditorialPageTransition transitionKey={transitionKey}>
        {content}
      </EditorialPageTransition>
    </EditorialShell>
  )
}
