import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { EventEntry } from '@/lib/cryptopedia-types'

import { EventDetail } from './platform-event-detail'

function event(overrides: Partial<EventEntry>): EventEntry {
  return {
    id: 'e', title: '2026 블록체인 진흥주간', summary: '국내외 연사 29명이 참여해요.', startsAt: '2026-11-25T10:00:00+09:00',
    endsAt: '2026-11-25T18:00:00+09:00', timezone: 'Asia/Seoul', allDay: false, status: 'UPCOMING', organizer: 'KISA',
    venueName: '코엑스', venueAddress: '서울 강남구 영동대로 513', city: 'Seoul', country: 'KR', isOnline: false,
    sourceUrl: 'https://www.kisa.or.kr/401/form?postSeq=3781', registrationUrl: 'https://event-us.kr/m/135409',
    imageUrl: null, category: null, tags: [], chain: 'web3-kr', project: null, publishedAt: null,
    fetchedAt: '2026-11-01T00:00:00Z', confidence: null, registrationDeadline: '2026-11-24T18:00:00+09:00',
    registrationStatus: 'OPEN', daysUntilDeadline: 15, audience: [], level: null, fee: null, relatedChains: [],
    scope: 'web3-kr', ...overrides,
  }
}

test('the detail leads with when, where and the official sign-up link', () => {
  const html = renderToStaticMarkup(<EventDetail event={event({})} />)
  assert.match(html, />모집중</)
  assert.match(html, />국내 Web3</)
  assert.match(html, /KISA 주최/)
  assert.match(html, /11월 25일 수요일/)
  assert.match(html, /오전 10:00 - 오후 6:00 · 한국시간/)
  assert.match(html, /코엑스 · Seoul/)
  assert.match(html, /서울 강남구 영동대로 513/)
  assert.match(html, /href="https:\/\/event-us\.kr\/m\/135409"[^>]*target="_blank"[^>]*>공식 페이지에서 신청/)
  assert.match(html, /국내외 연사 29명이 참여해요/)
  assert.match(html, /href="https:\/\/www\.kisa\.or\.kr\/401\/form\?postSeq=3781"[^>]*>원문 보기/)
  assert.ok(html.indexOf('공식 페이지에서 신청') < html.indexOf('국내외 연사'), 'sign-up comes before the introduction')
})

test('a finished or closed event offers no sign-up button and says why', () => {
  for (const overrides of [{ status: 'PAST' as const }, { registrationStatus: 'CLOSED' as const }]) {
    const html = renderToStaticMarkup(<EventDetail event={event(overrides)} />)
    assert.doesNotMatch(html, /공식 페이지에서 신청/)
    assert.match(html, /신청이 끝난 행사예요/)
  }
})

test('without a registration link it points to the original post', () => {
  const html = renderToStaticMarkup(<EventDetail event={event({ registrationUrl: null })} />)
  assert.match(html, /신청 방법은 원문에서 확인해 주세요/)
})
