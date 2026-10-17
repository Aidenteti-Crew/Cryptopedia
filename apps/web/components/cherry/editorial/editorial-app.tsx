'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { rememberDiscoveryScroll } from './discovery-state'
import { HUB_ENTRY_IDS, isHubEntry, type HubData } from '@/lib/cryptopedia-hub'

import { createCryptopediaRepository, type CryptopediaRepository } from '@/lib/cryptopedia-data'
import { createSnapshotFetch } from '@/lib/cryptopedia-live-snapshot'
import {
  CHAPTER_NAV,
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
import { EditorialEmpty, EditorialError, EditorialLoading } from './editorial-states'
import { EditorialPageTransition } from './editorial-page-transition'
import { EditorialShell } from './editorial-shell'
import { EcosystemPage } from './ecosystem-page'
import { EcosystemHomeV2 } from './ecosystem-home-v2'
import { BuilderTestPage } from './builder-test-page'
import { getChainHomeContent } from '@/lib/avalanche-home'
import { EventsPage } from './events-page'
import { FeedPage } from './feed-page'
import { ProjectDirectoryPage } from './project-directory-page'
import { HubLibraryPage } from './hub-library-page'
import { HubDetailPage } from './hub-detail-page'
import { getEditorialBreadcrumbs, menuEntryFor } from './editorial-breadcrumb'
import { useEditorialChain } from './editorial-chain-provider'
import { getChainTheme } from '@/lib/chain-theme'
import { pathForEditorialView } from '@/lib/cryptopedia-routes'

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
  | {
      kind: 'ecosystem'
      data: EcosystemPageData
      hub: HubData
      projects: EcosystemProjectsResponse | null
      feed: 'live' | 'unavailable'
    }
  | { kind: 'projects'; data: EcosystemProjectsResponse }
  | { kind: 'hub'; id: string; data: HubData }
  | { kind: 'collection'; data: CollectionPageData }
  | { kind: 'macro'; data: ContentEntry[] }
  | { kind: 'updates'; data: ContentEntry[] }
  | { kind: 'events'; screen: 'events' | 'event-archive'; data: EventFeedResponse }
  | { kind: 'article'; data: ArticleDetail }
  | { kind: 'book'; data: BookDetail }
  | { kind: 'builder-test' }

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; view: LoadedView }
  | { status: 'error'; message: string }

/* API 주소가 없는 배포(Vercel 데모)는 LIVE 화면을 굳힌 응답(public/cryptopedia/live)으로 그린다 */
const repository = process.env.NEXT_PUBLIC_API_URL
  ? createCryptopediaRepository()
  : createCryptopediaRepository(createSnapshotFetch(), '')

const NAV_SCREEN_IDS = new Set<ScreenId>([
  ...PRIMARY_NAV.map((item) => item.id),
  ...CHAPTER_NAV.map((item) => item.id),
  'event-archive',
  'chains',
  'ecosystem',
])

export interface LoadEditorialOptions {
  /** true 면 소식 피드(크롤러 API)가 실패해도 큐레이션 홈을 그린다. */
  offlineEcosystem?: boolean
}

export async function loadEditorialView(
  view: EditorialView,
  data: CryptopediaRepository,
  chainId: string,
  options: LoadEditorialOptions = {}
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
    case 'ecosystem': {
      const projectsRequest = data.getEcosystemProjects(chainId).catch(() => null)
      if (!options.offlineEcosystem) {
        const [ecosystem, hub, projects] = await Promise.all([
          data.getEcosystem(chainId),
          data.getHub(chainId),
          projectsRequest,
        ])
        return { kind: 'ecosystem', data: ecosystem, hub, projects, feed: 'live' }
      }
      // 피드가 꺼져 있어도 큐레이션 콘텐츠로 그린다 — 소식 영역만 "연결 불가"로 표시
      const [feed, hub, projects] = await Promise.all([
        data.getEcosystem(chainId).then(
          (page) => ({ ok: true as const, page }),
          (error: unknown) => ({ ok: false as const, error })
        ),
        data.getHub(chainId),
        projectsRequest,
      ])
      if (feed.ok) return { kind: 'ecosystem', data: feed.page, hub, projects, feed: 'live' }
      if (!data.getEcosystemOffline) throw feed.error
      return {
        kind: 'ecosystem',
        data: await data.getEcosystemOffline(chainId),
        hub,
        projects,
        feed: 'unavailable',
      }
    }
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
      return {
        kind: 'events',
        screen: view.id,
        data: await data.getEvents(chainId, view.id === 'event-archive' ? 'past' : undefined),
      }
    case 'updates':
      return { kind: 'updates', data: await data.getUpdates(chainId) }
    case 'builder-test':
      // 정적 화면 — 불러올 데이터가 없다 (문항은 lib/builder-test.ts)
      return { kind: 'builder-test' }
    case 'article':
    case 'book':
      throw new Error(`Invalid top-level screen: ${view.id}`)
  }
}

export function EditorialApp({
  view: routeView,
  homeVariant = 'current',
}: {
  view: EditorialView
  homeVariant?: 'current' | 'new'
}) {
  const router = useRouter()
  const isNewHome = homeVariant === 'new'
  const view = useMemo(
    () => routeView,
    [routeView.kind, routeView.id, 'parent' in routeView ? routeView.parent : null]
  )
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [retryVersion, setRetryVersion] = useState(0)
  const { activeChain, setActiveChain } = useEditorialChain()

  const chainTheme = getChainTheme(activeChain)
  const activeScreen = view.kind === 'screen' ? view.id : view.parent
  const transitionKey = `${getEditorialViewKey(view)}:${isNewHome ? 'new' : 'current'}`

  useEffect(() => {
    let cancelled = false
    setLoadState({ status: 'loading' })

    loadEditorialView(view, repository, activeChain.id, { offlineEcosystem: isNewHome })
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
  }, [view, retryVersion, activeChain.id, isNewHome])

  const selectScreen = (id: ScreenId) => {
    if (view.kind === 'screen' && ['projects', 'macro', 'events', 'updates'].includes(activeScreen))
      rememberDiscoveryScroll(`${activeChain.id}:${activeScreen}`)
    router.push(pathForEditorialView({ kind: 'screen', id }))
  }

  const openArticle = (id: string, fallbackParent = activeScreen) => {
    if (NAV_SCREEN_IDS.has(id as ScreenId)) {
      selectScreen(id as ScreenId)
      return
    }
    if (view.kind === 'screen' && ['projects', 'macro', 'events', 'updates'].includes(activeScreen))
      rememberDiscoveryScroll(`${activeChain.id}:${activeScreen}`)
    router.push(
      pathForEditorialView({
        kind: 'article',
        id,
        parent: resolveParentScreen(id) ?? fallbackParent,
      })
    )
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
        {
          const homeProps = {
            data: {
              ...loaded.data,
              title: activeChain.name,
              tagline: activeChain.tagline ?? loaded.data.tagline,
              taglineSourceUrl: activeChain.taglineSourceUrl ?? loaded.data.taglineSourceUrl,
            },
            hub: loaded.hub,
            projects: loaded.projects,
            onOpenScreen: selectScreen,
            onOpenLatest: (id: string) => openArticle(id, 'ecosystem'),
          }
          content = isNewHome ? (
            <EcosystemHomeV2 {...homeProps} chainId={activeChain.id} feed={loaded.feed} />
          ) : (
            <EcosystemPage
              {...homeProps}
              chainId={activeChain.id}
              chainLogoUrl={activeChain.logoUrl}
              onOpenProjectCategory={(category) =>
                router.push(
                  `${pathForEditorialView({ kind: 'screen', id: 'projects' })}${category ? `?category=${encodeURIComponent(category)}` : ''}`
                )
              }
            />
          )
        }
        break
      case 'projects':
        content = (
          <ProjectDirectoryPage data={loaded.data} stateKey={`${activeChain.id}:projects`} />
        )
        break
      case 'collection':
        content = (
          <CollectionPage data={loaded.data} onOpenEntry={(id) => openArticle(id, activeScreen)} />
        )
        break
      case 'hub':
        content = HUB_ENTRY_IDS.has(loaded.id) ? (
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
            onOpenInGraph={(conceptId) =>
              router.push(
                `${pathForEditorialView({ kind: 'article', id: 'skill-graph', parent: 'academy' })}?concept=${encodeURIComponent(conceptId)}`
              )
            }
          />
        )
        break
      case 'macro':
        content = (
          <FeedPage
            title="매크로 소식"
            introduction="금융기관 협업과 산업의 변화를 출처와 함께 읽습니다."
            stateKey={`${activeChain.id}:macro`}
            mode="macro"
            entries={loaded.data}
          />
        )
        break
      case 'updates':
        content = (
          <FeedPage
            title="개발 업데이트"
            introduction="프로토콜 변경과 개발 소식을 원문 출처와 함께 읽습니다."
            stateKey={`${activeChain.id}:updates`}
            mode="updates"
            entries={loaded.data}
          />
        )
        break
      case 'events':
        content = (
          <EventsPage
            stateKey={`${activeChain.id}:events`}
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
      case 'builder-test': {
        // 홈의 CTA에서 들어온다. 체인별 콘텐츠가 없는 체인은 안내만 보여 준다.
        const homeContent = getChainHomeContent(activeChain.id)
        content = homeContent ? (
          <BuilderTestPage content={homeContent} onOpen={(id) => openArticle(id, 'ecosystem')} />
        ) : (
          <EditorialEmpty message="이 컬렉션에는 아직 빌더 유형 테스트가 없습니다." />
        )
        break
      }
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
      activeEntryId={
        view.kind === 'article'
          ? (menuEntryFor(view.id, breadcrumbContext?.hub) ?? view.id)
          : undefined
      }
      activeChainName={activeChain.name}
      activeChainLogoUrl={activeChain.logoUrl}
      chainTheme={chainTheme}
      onLogoClick={() => router.push('/about')}
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
