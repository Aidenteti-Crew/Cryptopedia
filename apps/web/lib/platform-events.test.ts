import assert from 'node:assert/strict'
import test from 'node:test'

import type { EventEntry } from './cryptopedia-types'
import {
  calendarEntries,
  chainLabel,
  chainOptions,
  dayHeading,
  eventChainKeys,
  eventHost,
  eventHref,
  eventLocation,
  eventTitle,
  eventsOnDay,
  eventWhen,
  filterPlatformEvents,
  groupPlatformEvents,
  listedEventIds,
  listedEvents,
  neighbors,
  scopeLabel,
  signUpUrl,
} from './platform-events'

const NOW = new Date('2026-11-09T03:00:00Z') // 2026-11-09 12:00 KST, a Monday

function event(id: string, startsAt: string, overrides: Partial<EventEntry> = {}): EventEntry {
  return {
    id, title: id, summary: '', startsAt, endsAt: null, timezone: 'Asia/Seoul', allDay: false,
    status: 'UPCOMING', organizer: null, venueName: null, venueAddress: null, city: null,
    country: null, isOnline: false, sourceUrl: null, registrationUrl: null, imageUrl: null,
    category: null, tags: [], chain: 'avalanche', project: null, publishedAt: null,
    fetchedAt: '2026-11-01T00:00:00Z', confidence: null, registrationDeadline: null,
    registrationStatus: 'UNKNOWN', daysUntilDeadline: null, audience: [], level: null, fee: null,
    relatedChains: [], scope: null, ...overrides,
  }
}

test('groups upcoming events by Seoul day, earliest first, and keeps time order inside a day', () => {
  const groups = groupPlatformEvents(
    [
      event('late', '2026-11-11T18:30:00+09:00'),
      event('tomorrow', '2026-11-10T14:00:00+09:00'),
      event('early', '2026-11-11T09:00:00+09:00'),
    ],
    NOW
  )
  assert.deepEqual(
    groups.days.map(([day, items]) => [day, items.map((e) => e.id)]),
    [
      ['2026-11-10', ['tomorrow']],
      ['2026-11-11', ['early', 'late']],
    ]
  )
})

test('an event that began before today and has not ended is listed once as ongoing', () => {
  const groups = groupPlatformEvents(
    [
      event('expo', '2026-11-08T10:00:00+09:00', { endsAt: '2026-11-12T18:00:00+09:00', status: 'ONGOING' }),
      event('yesterday', '2026-11-08T10:00:00+09:00', { status: 'ONGOING' }),
    ],
    NOW
  )
  assert.deepEqual(groups.ongoing.map((e) => e.id), ['expo'])
  assert.deepEqual(groups.days, [])
})

test('past and cancelled events stay out of the list; postponed ones stay in', () => {
  const groups = groupPlatformEvents(
    [
      event('past', '2026-11-20T10:00:00+09:00', { status: 'PAST' }),
      event('cancelled', '2026-11-20T10:00:00+09:00', { status: 'CANCELLED' }),
      event('postponed', '2026-11-20T10:00:00+09:00', { status: 'POSTPONED' }),
    ],
    NOW
  )
  assert.deepEqual(groups.days.flatMap(([, items]) => items.map((e) => e.id)), ['postponed'])
})

test('day headings read 오늘, 내일, then month and day, each with its weekday', () => {
  assert.deepEqual(dayHeading('2026-11-09', NOW), { date: '오늘', weekday: '월요일' })
  assert.deepEqual(dayHeading('2026-11-10', NOW), { date: '내일', weekday: '화요일' })
  assert.deepEqual(dayHeading('2026-11-11', NOW), { date: '11월 11일', weekday: '수요일' })
})

test('the host comes from a Luma "Hosted by" summary when there is no organizer', () => {
  assert.deepEqual(eventHost({ summary: 'Hosted by Team1 Korea', organizer: null }), {
    host: 'Team1 Korea',
    summaryIsHost: true,
  })
  assert.deepEqual(eventHost({ summary: 'A workshop', organizer: 'KISA' }), {
    host: 'KISA',
    summaryIsHost: false,
  })
})

test('scope label uses the feed scope and falls back to the chain for old snapshots', () => {
  assert.equal(scopeLabel({ scope: 'web3-kr', chain: 'web3-kr' }), '국내 Web3')
  assert.equal(scopeLabel({ scope: null, chain: 'avalanche' }), 'Avalanche')
  assert.equal(scopeLabel({ scope: null, chain: 'unknown' }), null)
})

test('previous and next follow the listed order: ongoing first, then by day', () => {
  const groups = groupPlatformEvents(
    [
      event('b', '2026-11-11T09:00:00+09:00'),
      event('expo', '2026-11-08T10:00:00+09:00', { endsAt: '2026-11-12T18:00:00+09:00', status: 'ONGOING' }),
      event('a', '2026-11-10T09:00:00+09:00'),
    ],
    NOW
  )
  const ids = listedEventIds(groups)
  assert.deepEqual(ids, ['expo', 'a', 'b'])
  assert.deepEqual(neighbors(ids, 'a'), { previous: 'expo', next: 'b' })
  assert.deepEqual(neighbors(ids, 'expo'), { previous: null, next: 'a' })
  assert.deepEqual(neighbors(ids, 'past-event'), { previous: null, next: null })
})

test('the detail time reads day and Seoul time range, or 종일', () => {
  assert.deepEqual(
    eventWhen({ startsAt: '2026-11-11T18:00:00+09:00', endsAt: '2026-11-11T22:00:00+09:00', allDay: false }),
    { day: '11월 11일 수요일', time: '오후 6:00 - 오후 10:00' }
  )
  assert.deepEqual(eventWhen({ startsAt: '2026-11-25T00:00:00+09:00', endsAt: null, allDay: true }), {
    day: '11월 25일 수요일',
    time: '종일',
  })
  assert.equal(
    eventWhen({ startsAt: '2026-11-25T09:00:00+09:00', endsAt: '2026-11-26T18:00:00+09:00', allDay: false }).day,
    '11월 25일 수요일 - 11월 26일 목요일'
  )
})

test('an event link opens the detail on /events', () => {
  assert.equal(eventHref('01a1 x'), '/events?event=01a1%20x')
})

test('titles drop notice brackets and a closing date the card already shows', () => {
  assert.equal(
    eventTitle('「2026 블록체인 밋업데이(BCMD)」 31회차 교육생 모집(~11.13)'),
    '2026 블록체인 밋업데이(BCMD) 31회차 교육생 모집'
  )
  assert.equal(
    eventTitle('「2026 블록체인 진흥주간」 사전등록 안내(11/25~26, 서울 코엑스)'),
    '2026 블록체인 진흥주간 사전등록 안내'
  )
  assert.equal(eventTitle('Builder Workshop: Claude & x402'), 'Builder Workshop: Claude & x402')
  assert.equal(eventTitle('Avalanche Summit (Seoul)'), 'Avalanche Summit (Seoul)')
})

test('the place is left out when the source names none', () => {
  assert.equal(eventLocation({ isOnline: false, venueName: null, city: null }), null)
  assert.equal(eventLocation({ isOnline: true, venueName: null, city: null }), '온라인')
  assert.equal(eventLocation({ isOnline: false, venueName: '코엑스', city: '서울' }), '코엑스 · 서울')
})

test('a Luma page is where people sign up; other source pages are not', () => {
  assert.equal(signUpUrl({ registrationUrl: 'https://event-us.kr/m/1', sourceUrl: 'https://luma.com/a' }), 'https://event-us.kr/m/1')
  assert.equal(signUpUrl({ registrationUrl: null, sourceUrl: 'https://luma.com/f95ppglk' }), 'https://luma.com/f95ppglk')
  assert.equal(signUpUrl({ registrationUrl: null, sourceUrl: 'https://lu.ma/x' }), 'https://lu.ma/x')
  assert.equal(signUpUrl({ registrationUrl: null, sourceUrl: 'https://www.kisa.or.kr/401' }), null)
})

test('chain keys come from chain, scope and related chains, lowercased and without repeats', () => {
  assert.deepEqual(eventChainKeys(event('a', '2026-11-11T09:00:00+09:00', { chain: 'Avalanche', scope: 'avalanche' })), ['avalanche'])
  assert.deepEqual(
    eventChainKeys(event('b', '2026-11-11T09:00:00+09:00', { chain: 'web3-kr', scope: null, relatedChains: ['Avalanche', 'web3-kr', ' '] })),
    ['web3-kr', 'avalanche']
  )
  assert.deepEqual(eventChainKeys(event('c', '2026-11-11T09:00:00+09:00', { chain: null, scope: null })), [])
})

test('chain options are counted from the data, biggest first (ties by label), with readable labels', () => {
  const options = chainOptions([
    event('a1', '2026-11-11T09:00:00+09:00', { chain: 'avalanche', scope: 'avalanche' }),
    event('a2', '2026-11-12T09:00:00+09:00', { chain: 'Avalanche', scope: null }),
    event('k1', '2026-11-13T09:00:00+09:00', { chain: 'web3-kr', scope: 'web3-kr', relatedChains: ['avalanche'] }),
    event('s1', '2026-11-14T09:00:00+09:00', { chain: 'solana', scope: null }),
    event('s2', '2026-11-14T10:00:00+09:00', { chain: 'base', scope: null }),
  ])
  assert.deepEqual(options, [
    { key: 'avalanche', label: 'Avalanche', count: 3 },
    { key: 'web3-kr', label: '국내 Web3', count: 1 },
    { key: 'base', label: 'Base', count: 1 },
    { key: 'solana', label: 'Solana', count: 1 },
  ])
  assert.deepEqual(chainOptions([]), [])
  assert.equal(chainLabel('web3-kr'), '국내 Web3')
  assert.equal(chainLabel('near'), 'Near')
})

test('filtering keeps events of any selected chain and, when asked, only the saved ones', () => {
  const events = [
    event('a', '2026-11-11T09:00:00+09:00', { chain: 'avalanche' }),
    event('k', '2026-11-12T09:00:00+09:00', { chain: 'web3-kr', scope: 'web3-kr' }),
    event('both', '2026-11-13T09:00:00+09:00', { chain: 'web3-kr', scope: 'web3-kr', relatedChains: ['Avalanche'] }),
  ]
  const ids = (chains: string[], savedIds: ReadonlySet<string> | null) =>
    filterPlatformEvents(events, { chains, savedIds }).map((e) => e.id)
  assert.deepEqual(ids([], null), ['a', 'k', 'both'])
  assert.deepEqual(ids(['avalanche'], null), ['a', 'both'])
  assert.deepEqual(ids(['web3-kr'], null), ['k', 'both'])
  assert.deepEqual(ids(['avalanche', 'web3-kr'], null), ['a', 'k', 'both'])
  assert.deepEqual(ids([], new Set(['k', 'gone'])), ['k'])
  assert.deepEqual(ids(['avalanche'], new Set(['k'])), [])
  assert.deepEqual(ids([], new Set()), [])
})

test('the calendar lists events that are not over, whatever their day', () => {
  const events = [
    event('up', '2026-11-11T09:00:00+09:00'),
    event('past', '2026-11-11T09:00:00+09:00', { status: 'PAST' }),
    event('cancelled', '2026-11-11T09:00:00+09:00', { status: 'CANCELLED' }),
    event('postponed', '2026-11-11T09:00:00+09:00', { status: 'POSTPONED' }),
  ]
  assert.deepEqual(listedEvents(events).map((e) => e.id), ['up', 'postponed'])
})

test('a multi-day event covers each of its days and an odd end date does not hide it', () => {
  const expo = event('expo', '2026-11-10T10:00:00+09:00', { endsAt: '2026-11-12T18:00:00+09:00', title: '「엑스포」 안내(~11.12)' })
  const backwards = event('odd', '2026-11-10T10:00:00+09:00', { endsAt: '2026-11-09T18:00:00+09:00' })
  const oneDay = event('one', '2026-11-11T20:00:00+09:00', { endsAt: '2026-11-11T22:00:00+09:00' })
  assert.deepEqual(calendarEntries([expo, backwards, oneDay]), [
    { id: 'expo', title: '엑스포 안내', day: '2026-11-10', endDay: '2026-11-12' },
    { id: 'odd', title: 'odd', day: '2026-11-10' },
    { id: 'one', title: 'one', day: '2026-11-11' },
  ])
  const on = (day: string) => eventsOnDay([oneDay, expo, backwards], day).map((e) => e.id)
  assert.deepEqual(on('2026-11-09'), [])
  assert.deepEqual(on('2026-11-10'), ['expo', 'odd'])
  assert.deepEqual(on('2026-11-11'), ['expo', 'one'])
  assert.deepEqual(on('2026-11-12'), ['expo'])
  assert.deepEqual(on('2026-11-13'), [])
})
