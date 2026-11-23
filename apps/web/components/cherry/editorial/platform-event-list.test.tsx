import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { EventEntry } from '@/lib/cryptopedia-types'
import { groupPlatformEvents } from '@/lib/platform-events'

import { PlatformEventList } from './platform-event-list'

const NOW = new Date('2026-11-09T03:00:00Z')

function event(overrides: Partial<EventEntry>): EventEntry {
  return {
    id: 'e', title: 'Event', summary: '', startsAt: '2026-11-11T18:00:00+09:00', endsAt: null,
    timezone: 'Asia/Seoul', allDay: false, status: 'UPCOMING', organizer: null, venueName: null,
    venueAddress: null, city: null, country: null, isOnline: false, sourceUrl: null,
    registrationUrl: null, imageUrl: null, category: null, tags: [], chain: 'web3-kr', project: null,
    publishedAt: null, fetchedAt: '2026-11-01T00:00:00Z', confidence: null,
    registrationDeadline: null, registrationStatus: 'UNKNOWN', daysUntilDeadline: null, audience: [],
    level: null, fee: null, relatedChains: [], scope: 'web3-kr', ...overrides,
  }
}

const render = (events: EventEntry[]) =>
  renderToStaticMarkup(<PlatformEventList groups={groupPlatformEvents(events, NOW)} now={NOW} />)

test('a card shows time, title, host, place, registration badge, scope and the official link', () => {
  const html = render([
    event({
      title: '블록체인 진흥주간',
      organizer: 'KISA',
      venueName: '코엑스',
      city: 'Seoul',
      registrationStatus: 'CLOSING_SOON',
      daysUntilDeadline: 2,
      registrationUrl: 'https://event-us.kr/m/135409',
    }),
  ])
  assert.match(html, /11월 11일 <span[^>]*>수요일</)
  assert.match(html, /오후 6:00/)
  assert.match(html, /블록체인 진흥주간/)
  assert.match(html, /KISA 주최/)
  assert.match(html, /코엑스 · Seoul/)
  assert.match(html, />마감 임박 D-2</)
  assert.match(html, />국내 Web3</)
  assert.match(html, /href="https:\/\/event-us\.kr\/m\/135409"[^>]*target="_blank"[^>]*>공식 페이지에서 신청/)
})

test('without upcoming events it says so and points to past events', () => {
  const html = render([event({ status: 'PAST', startsAt: '2026-09-28T14:00:00+09:00' })])
  assert.match(html, /지금 모집 중이거나 다가오는 행사가 없어요/)
  assert.match(html, /href="\/knowledge\/events\/archive"/)
})

test('a Luma card shows its cover, a sign-up link and no empty place line', () => {
  const html = render([
    event({
      title: 'Web3 Run for Good',
      sourceUrl: 'https://luma.com/f95ppglk',
      imageUrl: 'https://images.lumacdn.com/cdn-cgi/image/w/x.png',
    }),
  ])
  assert.match(html, /<img src="https:\/\/images\.lumacdn\.com\/cdn-cgi\/image\/w\/x\.png"/)
  assert.doesNotMatch(html, /event-cover-placeholder/)
  assert.match(html, /href="https:\/\/luma\.com\/f95ppglk"[^>]*>공식 페이지에서 신청/)
  assert.doesNotMatch(html, /장소 정보 없음/)
})

test('a card without a cover keeps the same shape with a placeholder and a tidy title', () => {
  const html = render([event({ title: '「2026 블록체인 밋업데이(BCMD)」 31회차 교육생 모집(~11.13)' })])
  assert.match(html, /event-cover-placeholder/)
  assert.match(html, />2026 블록체인 밋업데이\(BCMD\) 31회차 교육생 모집</)
})

test('every card carries a heart that sits above the card link and starts unsaved', () => {
  const html = render([event({ id: 'a' }), event({ id: 'b', title: 'Second' })])
  const hearts = html.match(/<button[^>]*aria-label="관심 행사에 추가"[^>]*>/g) ?? []
  assert.equal(hearts.length, 2)
  for (const heart of hearts) {
    assert.match(heart, /aria-pressed="false"/)
    assert.match(heart, /relative z-10/)
  }
})
