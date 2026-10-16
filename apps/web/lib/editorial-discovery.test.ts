import assert from 'node:assert/strict'
import test from 'node:test'

import { calendarDay, filterEvents, filterFeed, filterProjects, suggestedEventDay, suggestedFeedDay, eventsFromDay } from './editorial-discovery'
import type { ContentEntry, EcosystemProject, EventEntry } from './cryptopedia-types'

const project = (name: string, category: string): EcosystemProject => ({
  id: name, key: name, name, category, developer: 'Avalanche Labs', description: 'Onchain analytics',
  websiteUrl: null, documentationUrl: null, sourceUrl: null, chains: ['avalanche'],
  importance: 3, importanceReason: null,
})

const entry = (id: string, overrides: Partial<ContentEntry> = {}): ContentEntry => ({
  id, title: id, summary: 'Release notes', kind: 'UPDATE', sourceName: 'Builder Hub',
  publishedAt: '2026-10-10T00:00:00Z', subKind: 'RELEASE', ...overrides,
})

const event = (id: string, overrides: Partial<EventEntry> = {}): EventEntry => ({
  id, title: id, summary: 'Meet builders', startsAt: '2026-10-17T05:00:00Z', endsAt: null,
  timezone: 'Asia/Seoul', allDay: false, status: 'UPCOMING', organizer: 'Team1',
  venueName: 'Seoul', venueAddress: null, city: 'Seoul', country: 'KR', isOnline: false,
  sourceUrl: null, registrationUrl: null, imageUrl: null, category: 'Meetup', tags: [],
  chain: 'avalanche', project: null, publishedAt: null, fetchedAt: '2026-10-14T00:00:00Z',
  confidence: null, ...overrides,
})

test('publication range includes both selected Korean calendar dates', () => {
  const items = [entry('inside', {publishedAt:'2026-10-15T14:59:00Z'}), entry('outside', {publishedAt:'2026-10-15T15:00:00Z'})]
  assert.deepEqual(filterFeed(items, {query:'',source:'all',kind:'all',period:'all',from:'2026-10-15',to:'2026-10-15'}).map((item)=>item.id), ['inside'])
})

test('event timeline starts at selected day and retains ongoing multi-day events', () => {
  const items = [event('earlier',{startsAt:'2026-10-10T00:00:00Z'}),event('next'),event('ongoing',{startsAt:'2026-10-14T00:00:00Z',endsAt:'2026-10-16T00:00:00Z'}),event('next month',{startsAt:'2026-11-01T00:00:00Z'})]
  assert.deepEqual(eventsFromDay(items,'2026-10-15','2026-10','future').map((item)=>item.id),['ongoing','next'])
})

test('project search and multiple categories work together', () => {
  const items = [project('Artemis', 'Analytics & Data'), project('Avalanche Stables', 'Analytics & Data'), project('Aave', 'DeFi')]
  assert.deepEqual(filterProjects(items, 'analytics', ['Analytics & Data']).map((item) => item.name), ['Artemis', 'Avalanche Stables'])
  assert.deepEqual(filterProjects(items, 'aave', ['Analytics & Data']).map((item) => item.name), [])
  assert.equal(filterProjects(items, '', ['Analytics & Data', 'DeFi']).length, 3)
  assert.deepEqual(filterProjects([{ ...project('No category', 'DeFi'), category: null }], '', ['기타']).map((item) => item.name), ['No category'])
})

test('feed filters search, source, kind and date without using collectedAt', () => {
  const items = [entry('Helicon'), entry('ACP-267', { sourceName: 'Forum', subKind: 'ACP', publishedAt: '2026-09-01T00:00:00Z' })]
  assert.deepEqual(filterFeed(items, { query: 'release', source: 'Builder Hub', kind: 'RELEASE', period: '30' }, new Date('2026-10-15T00:00:00Z')).map((item) => item.id), ['Helicon'])
  assert.equal(filterFeed(items, { query: '', source: 'all', kind: 'all', period: '30' }, new Date('2026-10-15T00:00:00Z')).length, 1)
})

test('event filters combine status, format, category and search', () => {
  const items = [event('Seoul meetup'), event('Online summit', { isOnline: true, category: 'Conference', status: 'PAST' })]
  assert.deepEqual(filterEvents(items, { query: 'team1', status: 'UPCOMING', format: 'offline', category: 'Meetup' }).map((item) => item.id), ['Seoul meetup'])
  assert.equal(filterEvents(items, { query: '', status: 'PAST', format: 'offline', category: 'all' }).length, 0)
})

test('event period filters use event dates rather than publication dates', () => {
  const items = [event('last week', { startsAt: '2026-10-08T05:00:00Z', status: 'PAST' }), event('next week', { startsAt: '2026-10-22T05:00:00Z' }), event('next year', { startsAt: '2027-01-02T05:00:00Z' })]
  const filters = { query: '', status: 'all', format: 'all', category: 'all', period: 'next30' }
  assert.deepEqual(filterEvents(items, filters, new Date('2026-10-15T00:00:00Z')).map((item) => item.id), ['next week'])
  assert.deepEqual(filterEvents(items, { ...filters, period: 'past30' }, new Date('2026-10-15T00:00:00Z')).map((item) => item.id), ['last week'])
})

test('calendar day uses Korean date for an offset timestamp', () => {
  assert.equal(calendarDay('2026-10-16T16:30:00Z'), '2026-10-17')
})

test('event filter can focus the first upcoming or the latest matching past day', () => {
  const items = [event('older', { startsAt: '2026-09-01T00:00:00Z', status: 'PAST' }), event('newer', { startsAt: '2026-09-20T00:00:00Z', status: 'PAST' }), event('upcoming')]
  assert.equal(suggestedEventDay(items), '2026-10-17')
  assert.equal(suggestedEventDay(items.filter((item) => item.status === 'PAST')), '2026-09-20')
})

test('feed filter can focus the latest matching publication month', () => {
  assert.equal(suggestedFeedDay([entry('older', { publishedAt: '2025-11-01T00:00:00Z' }), entry('newer')]), '2026-10-10')
  assert.equal(suggestedFeedDay([]), null)
})
