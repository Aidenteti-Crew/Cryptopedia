import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { CollectionVolume, ContentEntry, EcosystemProjectsResponse, EventEntry } from '@/lib/cryptopedia-types'

import { EventsPage } from './events-page'
import { FeedPage } from './feed-page'
import { ProjectsPage } from './projects-page'
import { ProjectDirectoryPage } from './project-directory-page'
import { EditorialViewToggle } from './editorial-view-toggle'

test('macro keeps its calendar toggle and development updates has no calendar view',()=>{
  for(const mode of ['macro','updates'] as const) {
    const html=renderToStaticMarkup(<FeedPage mode={mode} title={mode} eyebrow="" introduction="" entries={[]}/>)
    assert.equal((html.match(/aria-label="달력 표시"/g)??[]).length,mode === 'macro' ? 1 : 0)
    assert.doesNotMatch(html,/aria-label="리스트"/)
    assert.doesNotMatch(html,/aria-label="달력"/)
  }
})

test('view toggle uses icons with accessible names and tooltips', () => {
  const html = renderToStaticMarkup(<EditorialViewToggle value="calendar" onChange={() => undefined} />)
  assert.match(html, /aria-label="리스트" title="리스트"/)
  assert.match(html, /aria-label="달력" title="달력" aria-pressed="true"/)
  assert.doesNotMatch(html, />리스트</)
  assert.doesNotMatch(html, />달력</)
})

const volumes: CollectionVolume[] = [
  {
    id: 'avalanche',
    name: 'Avalanche',
    type: 'CHAIN',
    volume: 1,
    networkType: 'C-CHAIN',
    description: 'Chain',
    coverAsset: '/cryptopedia/assets/book-avalanche.png',
    href: 'book-avalanche',
  },
  {
    id: 'allblue',
    name: 'All blue',
    type: 'PROJECT',
    volume: 4,
    networkType: 'PROJECT COLLECTION',
    description: 'Project',
    coverAsset: '/cryptopedia/assets/book-allblue.png',
    href: 'book-allblue',
  },
]

const entries: ContentEntry[] = [
  {
    id: 'institutional',
    order: 1,
    title: '금융기관 협업 소식',
    summary: '발표 요약',
    kind: 'MACRO',
  },
]

function event(overrides: Partial<EventEntry>): EventEntry {
  return {
    id: 'event',
    title: 'Event',
    summary: 'Summary',
    startsAt: '2026-11-01T10:00:00+09:00',
    endsAt: null,
    timezone: 'Asia/Seoul',
    allDay: false,
    status: 'UPCOMING',
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
    chain: 'Avalanche',
    project: null,
    publishedAt: null,
    fetchedAt: '2026-10-01T00:00:00+09:00',
    confidence: null,
    ...overrides,
  }
}

test('separates chain and project collections', () => {
  const html = renderToStaticMarkup(<ProjectsPage volumes={volumes} onOpenBook={() => undefined} />)

  assert.match(html, /CHAIN COLLECTION/)
  assert.match(html, /PROJECT COLLECTION/)
  assert.match(html, /Avalanche/)
  assert.match(html, /All blue/)
  assert.match(html, /book-avalanche\.png/)
})

test('renders searchable feed controls and visible publication metadata', () => {
  const html = renderToStaticMarkup(
    <FeedPage
      title="매크로 소식"
      introduction="금융기관 협업과 산업의 변화를 출처와 함께 읽습니다."
      mode="macro"
      entries={[{ ...entries[0], sourceName: 'Avalanche X', publishedAt: '2026-10-13T18:00:00Z', subKind: 'COLLAB' }]}
      onOpenEntry={() => undefined}
    />
  )

  assert.match(html, /제목·내용·출처 검색/)
  assert.match(html, /기관 협업/)
  assert.match(html, /Avalanche X/)
  assert.match(html, /2026\.10\.14/)
  assert.match(html, /달력/)
  assert.doesNotMatch(html, /aria-label="출처"/)
  assert.match(html, /금융기관 협업 소식/)
  assert.doesNotMatch(html, /editorial-display[^>]*>매크로 소식/)
})

test('latest updates mix technical articles and different products in publication order', () => {
  const html=renderToStaticMarkup(<FeedPage title="개발 업데이트" eyebrow="" introduction="" mode="updates" entries={[
    {id:'a',title:'Coreth release',summary:'',kind:'UPDATE',subKind:'RELEASE',sourceName:'Coreth Releases',version:'v1.0.0-rc.1',publishedAt:'2026-08-01T00:00:00Z'},
    {id:'b',title:'Subnet release',summary:'',kind:'UPDATE',subKind:'RELEASE',sourceName:'Subnet-EVM Releases',version:'v2.0.0',publishedAt:'2026-09-01T00:00:00Z'},
    {id:'c',title:'Newest technical article',summary:'',kind:'UPDATE',subKind:'BLOG',sourceName:'Builder Hub',publishedAt:'2026-10-01T00:00:00Z'},
  ]}/>)
  assert.match(html,/전체 업데이트/)
  assert.match(html,/제품별 버전 이력/)
  assert.ok(html.indexOf('Newest technical article')<html.indexOf('Subnet release'))
  assert.ok(html.indexOf('Subnet release')<html.indexOf('Coreth release'))
  assert.doesNotMatch(html,/aria-label="Coreth Releases 버전 이력"/)
  assert.match(html,/출시 후보/)
})

test('live feed entries open their source instead of a missing internal article', () => {
  const html = renderToStaticMarkup(
    <FeedPage
      title="매크로 소식"
      introduction="실제 수집 자료"
      mode="macro"
      entries={[{ id: 'crawler-1', title: '수집 기사', summary: '요약', kind: 'MACRO', sourceUrl: 'https://example.org/article' }]}
    />
  )
  assert.match(html, /href="https:\/\/example\.org\/article"/)
  assert.match(html, /수집 기사/)
})

test('curated entries keep their internal navigation when a source URL is present', () => {
  const html = renderToStaticMarkup(
    <FeedPage
      title="자료"
      introduction="내부 상세 페이지"
      mode="macro"
      entries={[{ id: 'curated-1', title: '내부 자료', summary: '요약', kind: 'ARTICLE', sourceUrl: 'https://example.org/source' }]}
      onOpenEntry={() => undefined}
    />
  )
  assert.match(html, /<button[^>]*>/)
  assert.doesNotMatch(html, /href="https:\/\/example\.org\/source"/)
})

test('project directory shows API categories and official project links', () => {
  const data: EcosystemProjectsResponse = {
    items: [{ id: 'project-1', key: 'project-1', name: 'Live Wallet', category: 'Wallets', developer: 'Team', websiteUrl: 'https://example.org/wallet', documentationUrl: null, description: 'Crawler project', chains: ['avalanche'], sourceUrl: 'https://example.org/source', importance: 4, importanceReason: 'Useful' }],
    categories: [{ name: 'Wallets', count: 1 }], total: 1, generatedAt: '2026-10-14T00:00:00Z',
  }
  const html = renderToStaticMarkup(<ProjectDirectoryPage data={data} />)
  assert.match(html, /Wallets/)
  assert.match(html, /Live Wallet/)
  assert.match(html, /href="https:\/\/example\.org\/wallet"/)
  assert.match(html, /분야 선택/)
  assert.match(html, /aria-label="카드 보기"/)
  assert.match(html, /aria-label="리스트 보기"/)
  assert.match(html, /검색 결과/)
  assert.doesNotMatch(html, /큐레이션 데모/)
})

test('unnamed project category remains selectable as 기타', () => {
  const data: EcosystemProjectsResponse = {
    items: [{ id: 'other', key: 'other', name: 'Other project', category: null, developer: null, websiteUrl: null, documentationUrl: null, description: null, chains: ['avalanche'], sourceUrl: null, importance: null, importanceReason: null }],
    categories: [{ name: 'Uncategorized', count: 1 }], total: 1, generatedAt: '2026-10-14T00:00:00Z',
  }
  const html = renderToStaticMarkup(<ProjectDirectoryPage data={data} />)
  assert.match(html, /기타/)
  assert.doesNotMatch(html, /Uncategorized/)
})

test('renders event calendar, list switch and readable status labels', () => {
  const html = renderToStaticMarkup(
    <EventsPage
      events={[
        event({ id: 'upcoming', title: 'Upcoming', category: 'COMMUNITY' }),
        event({ id: 'past', title: 'Past', status: 'PAST' }),
        event({ id: 'cancelled', title: 'Cancelled', status: 'CANCELLED' }),
      ]}
      onOpenArchive={() => undefined}
    />
  )

  assert.match(html, /달력/)
  assert.match(html, /aria-label="달력 숨기기"/)
  assert.match(html, /행사명·주최자·장소 검색/)
  assert.doesNotMatch(html, /오늘 ·|이 날짜에는 등록된 행사가 없습니다/)
  assert.doesNotMatch(html, /aria-label="일정 구분"/)
  assert.doesNotMatch(html, /aria-label="리스트"/)
  assert.doesNotMatch(html, /aria-label="행사 종류"/)
  assert.doesNotMatch(html, /aria-label="기간"/)
  assert.doesNotMatch(html, /href="null"/)
  assert.doesNotMatch(html, /editorial-display[^>]*>행사 및 이벤트/)
  assert.doesNotMatch(html, /전체 보기 →/)
})

test('renders the dedicated Figma event archive copy', () => {
  const html = renderToStaticMarkup(
    <EventsPage archiveMode events={[event({ id: 'past', title: 'Past', status: 'PAST' })]} />
  )

  assert.doesNotMatch(html, /← 행사 및 이벤트/)
  assert.match(html, />지난 이벤트</)
  assert.match(html, /종료된 행사와 커뮤니티의 기록을 모았습니다/)
  assert.match(html, /aria-label="행사 타임라인"/)
  assert.doesNotMatch(html, /다가오는 만남부터/)
})

test('empty event archive explains that no past events are available', () => {
  const html = renderToStaticMarkup(<EventsPage archiveMode events={[]} />)
  assert.match(html, /지난 행사가 없습니다/)
})
