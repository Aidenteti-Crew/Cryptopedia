'use client'

import { useEffect, useReducer, useState } from 'react'
import { HUB_ENTRY_IDS, isHubEntry, type HubData } from '@/lib/cryptopedia-hub'

import {
  createCryptopediaRepository,
  type CryptopediaRepository,
} from '@/lib/cryptopedia-data'
import {
  CHAPTER_NAV,
  DEFAULT_SCREEN_ID,
  PRIMARY_NAV,
  resolveParentScreen,
  type ScreenId,
} from '@/lib/cryptopedia-taxonomy'
import type {
  ArticleDetail,
  BookDetail,
  ChainCollectionPageData,
  CollectionPageData,
  ContentEntry,
  EcosystemProjectsResponse,
  EventFeedResponse,
  EcosystemPageData,
} from '@/lib/cryptopedia-types'

import { ArticleReader } from './article-reader'
import { BookDetailPage } from './book-detail-page'
import { ChainCollectionPage } from './chain-collection-page'
import { CollectionPage } from './collection-page'
import { EditorialError, EditorialLoading } from './editorial-states'
import { EditorialPageTransition } from './editorial-page-transition'
import { EditorialShell } from './editorial-shell'
import { EcosystemPage } from './ecosystem-page'
import { EventsPage } from './events-page'
import { FeedPage } from './feed-page'
import { ProjectDirectoryPage } from './project-directory-page'
import { HubLibraryPage } from './hub-library-page'
import { HubDetailPage } from './hub-detail-page'
import { getEditorialBreadcrumbs } from './editorial-breadcrumb'
import chainCatalog from '@/public/cryptopedia/chains.json'
import type { SelectedChain } from './editorial-brand'

export type EditorialView =
  | { kind: 'screen'; id: ScreenId }
  | { kind: 'article'; id: string; parent: ScreenId }
  | { kind: 'book'; id: string; parent: 'projects' }

export type EditorialViewAction =
  | { type: 'select-screen'; id: ScreenId }
  | { type: 'open-article'; id: string; parent: ScreenId }
  | { type: 'open-book'; id: string }
  | { type: 'back' }
  | { type: 'restore-view'; view: EditorialView }

export function getEditorialViewKey(view: EditorialView) {
  return `${view.kind}:${view.id}`
}

export function editorialViewReducer(
  view: EditorialView,
  action: EditorialViewAction
): EditorialView {
  switch (action.type) {
    case 'restore-view':
      return action.view
    case 'select-screen':
      return { kind: 'screen', id: action.id }
    case 'open-article':
      return {
        kind: 'article',
        id: action.id,
        parent: action.parent,
      }
    case 'open-book':
      return { kind: 'book', id: action.id, parent: 'projects' }
    case 'back':
      return view.kind === 'screen' ? view : { kind: 'screen', id: view.parent }
  }
}

type LoadedView =
  | { kind: 'chains'; data: ChainCollectionPageData }
  | { kind: 'ecosystem'; data: EcosystemPageData; hub: HubData }
  | { kind: 'projects'; data: EcosystemProjectsResponse }
  | { kind: 'hub'; id: string; data: HubData }
  | { kind: 'collection'; data: CollectionPageData }
  | { kind: 'macro'; data: ContentEntry[] }
  | { kind: 'updates'; data: ContentEntry[] }
  | { kind: 'events'; screen: 'events' | 'event-archive'; data: EventFeedResponse }
  | { kind: 'article'; data: ArticleDetail }
  | { kind: 'book'; data: BookDetail }

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; view: LoadedView }
  | { status: 'error'; message: string }

const repository = createCryptopediaRepository()

const NAV_SCREEN_IDS = new Set<ScreenId>([
  ...PRIMARY_NAV.map((item) => item.id),
  ...CHAPTER_NAV.map((item) => item.id),
  'event-archive',
  'chains',
  'ecosystem',
])

export async function loadEditorialView(
  view: EditorialView,
  data: CryptopediaRepository,
  chainId: string
): Promise<LoadedView> {
  if (view.kind === 'article') {
    if (isHubEntry(view.id)) return { kind: 'hub', id: view.id, data: await data.getHub(chainId) }
    return { kind: 'article', data: await data.getArticle(view.id) }
  }
  if (view.kind === 'book') {
    return { kind: 'book', data: await data.getBook(view.id) }
  }

  switch (view.id) {
    case 'chains':
      return { kind: 'chains', data: await data.getChains() }
    case 'ecosystem':
      const [ecosystem, hub] = await Promise.all([data.getEcosystem(chainId), data.getHub(chainId)])
      return { kind: 'ecosystem', data: ecosystem, hub }
    case 'fundamentals':
    case 'builders':
    case 'academy':
      return { kind: 'collection', data: await data.getCollection(view.id) }
    case 'projects':
      return { kind: 'projects', data: await data.getEcosystemProjects(chainId) }
    case 'macro':
      return { kind: 'macro', data: await data.getMacroArticles(chainId) }
    case 'events':
    case 'event-archive':
      return { kind: 'events', screen: view.id, data: await data.getEvents(chainId, view.id === 'event-archive' ? 'past' : undefined) }
    case 'updates':
      return { kind: 'updates', data: await data.getUpdates(chainId) }
    case 'article':
    case 'book':
      throw new Error(`Invalid top-level screen: ${view.id}`)
  }
}

export function EditorialApp() {
  const [view, dispatch] = useReducer(editorialViewReducer, {
    kind: 'screen',
    id: DEFAULT_SCREEN_ID,
  })
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [retryVersion, setRetryVersion] = useState(0)
  const [activeChain, setActiveChain] = useState<SelectedChain>(
    chainCatalog.items.find((chain) => chain.id === chainCatalog.currentChainId) ?? chainCatalog.items[0]
  )

  const activeScreen = view.kind === 'screen' ? view.id : view.parent
  const transitionKey = getEditorialViewKey(view)

  useEffect(() => {
    let cancelled = false
    setLoadState({ status: 'loading' })

    loadEditorialView(view, repository, activeChain.id)
      .then((loaded) => {
        if (!cancelled) setLoadState({ status: 'ready', view: loaded })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : '자료를 불러오지 못했습니다.'
        setLoadState({ status: 'error', message })
      })

    window.scrollTo({ top: 0, behavior: 'auto' })
    return () => {
      cancelled = true
    }
  }, [view, retryVersion, activeChain.id])

  const selectScreen = (id: ScreenId) => {
    dispatch({ type: 'select-screen', id })
  }

  const openArticle = (id: string, fallbackParent = activeScreen) => {
    if (NAV_SCREEN_IDS.has(id as ScreenId)) {
      selectScreen(id as ScreenId)
      return
    }
    dispatch({
      type: 'open-article',
      id,
      parent: resolveParentScreen(id) ?? fallbackParent,
    })
  }

  let content
  if (loadState.status === 'loading') {
    content = <EditorialLoading />
  } else if (loadState.status === 'error') {
    content = (
      <EditorialError
        message={loadState.message}
        onRetry={() => setRetryVersion((version) => version + 1)}
      />
    )
  } else {
    const loaded = loadState.view
    switch (loaded.kind) {
      case 'chains':
        content = (
          <ChainCollectionPage
            data={loaded.data}
            onOpenChain={(id) => {
              const chain = loaded.data.items.find((item) => item.id === id)
              if (!chain || chain.status !== 'AVAILABLE') return
              setActiveChain(chain)
              selectScreen('ecosystem')
            }}
          />
        )
        break
      case 'ecosystem':
        content = (
          <EcosystemPage
            data={{ ...loaded.data, title: activeChain.name, tagline: activeChain.tagline ?? loaded.data.tagline, taglineSourceUrl: activeChain.taglineSourceUrl ?? loaded.data.taglineSourceUrl }}
            hub={loaded.hub}
            onOpenScreen={selectScreen}
            onOpenLatest={(id) => openArticle(id, 'ecosystem')}
          />
        )
        break
      case 'projects':
        content = <ProjectDirectoryPage data={loaded.data} />
        break
      case 'collection':
        content = (
          <CollectionPage data={loaded.data} onOpenEntry={(id) => openArticle(id, activeScreen)} />
        )
        break
      case 'hub':
        content =
          HUB_ENTRY_IDS.has(loaded.id) ? (
            <HubLibraryPage
              key={loaded.id}
              id={loaded.id}
              data={loaded.data}
              onOpen={(id) => openArticle(id)}
            />
          ) : (
            <HubDetailPage
              key={loaded.id}
              id={loaded.id}
              data={loaded.data}
              onOpen={(id) => openArticle(id)}
            />
          )
        break
      case 'macro':
        content = (
          <FeedPage
            eyebrow="매크로 브리핑 / 수집 소식"
            title="매크로 소식"
            introduction="금융기관 협업과 산업의 변화를 출처와 함께 읽습니다."
            filters={['전체 소식', '기관 협업', '산업 동향']}
            entries={loaded.data}
          />
        )
        break
      case 'updates':
        content = (
          <FeedPage
            eyebrow="PROTOCOL / DEVELOPMENT UPDATES"
            title="개발 업데이트"
            introduction="프로토콜 변경과 개발 소식을 원문 출처와 함께 읽습니다."
            filters={['릴리스', '업그레이드', '기술 글']}
            entries={loaded.data}
          />
        )
        break
      case 'events':
        content = (
          <EventsPage
            events={loaded.data.items}
            archiveMode={loaded.screen === 'event-archive'}
            onOpenArchive={
              loaded.screen === 'events' ? () => selectScreen('event-archive') : undefined
            }
          />
        )
        break
      case 'article':
        content = (
          <ArticleReader
            article={loaded.data}
            onOpenRelated={(id) => openArticle(id, activeScreen)}
          />
        )
        break
      case 'book':
        content = (
          <BookDetailPage book={loaded.data} onOpenChapter={(id) => openArticle(id, 'projects')} />
        )
        break
    }
  }

  const loaded = loadState.status === 'ready' ? loadState.view : undefined
  const breadcrumbContext =
    loaded?.kind === 'hub' && loaded.id === view.id
      ? { hub: loaded.data }
      : loaded?.kind === 'article' && loaded.data.id === view.id
        ? { title: loaded.data.title }
        : loaded?.kind === 'book' && loaded.data.id === view.id
          ? { title: loaded.data.name }
          : undefined

  return (
    <EditorialShell
      breadcrumbs={getEditorialBreadcrumbs(view, breadcrumbContext)}
      onBreadcrumbNavigate={(target) => {
        if (target.kind === 'screen') selectScreen(target.id)
        else openArticle(target.id)
      }}
      activeScreen={activeScreen}
      activeEntryId={view.kind === 'article' ? view.id : undefined}
      activeChainName={activeChain.name}
      activeChainLogoUrl={activeChain.logoUrl}
      onSelectChain={(chain) => {
        setActiveChain(chain)
        selectScreen('ecosystem')
      }}
      onSelect={selectScreen}
      onOpenEntry={(id) => openArticle(id)}
    >
      <EditorialPageTransition transitionKey={transitionKey}>{content}</EditorialPageTransition>
    </EditorialShell>
  )
}
