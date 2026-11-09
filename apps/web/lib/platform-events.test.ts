import assert from 'node:assert/strict'
import test from 'node:test'

import type { EventEntry } from './cryptopedia-types'
import {
  dayHeading,
  eventHost,
  eventHref,
  eventWhen,
  groupPlatformEvents,
  listedEventIds,
  neighbors,
  scopeLabel,
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
