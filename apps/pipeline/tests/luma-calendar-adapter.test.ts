import { describe, expect, it, vi } from 'vitest'

import { LumaCalendarAdapter, mapLumaEvent } from '../src/adapters/luma-calendar-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { parseIcsEvents } from '../src/events/ics.js'
import {
  calendar,
  CHILE_EVENT,
  HIDDEN_ADDRESS_EVENT,
  KOREA_EVENT,
  NO_GEO_EVENT,
} from './support/luma-fixture.js'

const source: SourceConfig = {
  url: 'https://luma.com/Team1KOR',
  chain: 'avalanche',
  sourceName: 'Luma: Team1 Korea',
  sourceType: 'WEBSITE',
  adapter: 'LUMA_ICS',
  contentKind: 'EVENT',
  authority: 'OFFICIAL_COMMUNITY',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  luma: { calendarId: 'cal-pE5SNzqEFCTNpRU' },
}

function map(lines: string[]) {
  const [ev] = parseIcsEvents(calendar('Team1 Korea', lines))
  const result = mapLumaEvent(ev!, { chain: 'avalanche', calendarName: 'Team1 Korea' })
  if (!('event' in result)) throw new Error(result.skippedReason)
  return result.event
}

describe('mapLumaEvent', () => {
  it('maps a Korean in-person event with timezone from its coordinates', () => {
    expect(map(KOREA_EVENT)).toEqual({
      chain: 'avalanche',
      eventKey: 'luma-evt-5I3vezpRHD0bJ1z',
      title: 'Univ Connect: Aidenteti Crew',
      summary: 'Hosted by Team1 Korea, Team1 & AidentetiCrew',
      startsAt: new Date('2026-10-17T05:00:00Z'),
      endsAt: new Date('2026-10-17T07:00:00Z'),
      timezone: 'Asia/Seoul',
      allDay: false,
      organizer: 'Team1 Korea',
      venueName: '서울용산시제품제작소',
      venueAddress:
        'South Korea, Seoul, Yongsan District, Cheongpa-ro, 77 서울용산시제품제작소 2층, 3층',
      city: 'Seoul',
      country: 'KR',
      isOnline: false,
      sourceUrl: 'https://luma.com/f95ppglk',
      registrationUrl: null,
      category: 'COMMUNITY',
      tags: ['Avalanche', 'Team1', 'Team1 Korea'],
      statusOverride: null,
      confidence: 1,
      publishedAt: null,
    })
  })

  it('reads the address block where the country is on its own line', () => {
    expect(map(CHILE_EVENT)).toMatchObject({
      venueName: 'Campus San Joaquín, Pontificia Universidad Catolica de Chile',
      city: 'Macul',
      country: 'CL',
      timezone: 'America/Santiago',
    })
  })

  it('keeps a hidden-address event offline and takes its country from the coordinates', () => {
    expect(map(HIDDEN_ADDRESS_EVENT)).toMatchObject({
      isOnline: false,
      venueName: null,
      venueAddress: null,
      city: null,
      country: 'MX',
      timezone: 'America/Mexico_City',
      sourceUrl: 'https://luma.com/avax_ags',
      organizer: 'SamuelTecs',
    })
  })

  it('treats an event without coordinates as venue-to-be-announced, not online', () => {
    expect(map(NO_GEO_EVENT)).toMatchObject({
      isOnline: false,
      timezone: 'UTC',
      confidence: 0.7,
      venueAddress: null,
    })
    const online = NO_GEO_EVENT.map((l) =>
      l.startsWith('SUMMARY:') ? 'SUMMARY:Online Avalanche L1 Days.' : l
    )
    expect(map(online).isOnline).toBe(true)
    const meetLink = NO_GEO_EVENT.map((l) =>
      l.startsWith('LOCATION:') ? 'LOCATION:Google Meet' : l
    )
    expect(map(meetLink)).toMatchObject({ isOnline: true, venueAddress: 'Google Meet' })
  })

  it('places an all-day date at local midnight and honours CANCELLED', () => {
    const allDay = KOREA_EVENT.map((l) =>
      l.startsWith('DTSTART')
        ? 'DTSTART;VALUE=DATE:20261128'
        : l.startsWith('DTEND')
          ? 'DTEND;VALUE=DATE:20261129'
          : l.startsWith('STATUS')
            ? 'STATUS:CANCELLED'
            : l
    )
    expect(map(allDay)).toMatchObject({
      allDay: true,
      startsAt: new Date('2026-11-27T15:00:00Z'),
      endsAt: new Date('2026-11-28T15:00:00Z'),
      statusOverride: 'CANCELLED',
    })
  })

  it.each([
    ['Agentic Hackathon', 'HACKATHON'],
    ['BK Fintech Hackday Season 15', 'HACKATHON'],
    ['Avalanche Team1 Vietnam UniHack: Opening Event', 'HACKATHON'],
    ['Avalanche Summit LATAM', 'CONFERENCE'],
    ['Web3 Chill Night', 'COMMUNITY'],
  ])('categorises "%s" as %s', (title, category) => {
    expect(
      map(KOREA_EVENT.map((l) => (l.startsWith('SUMMARY:') ? `SUMMARY:${title}` : l))).category
    ).toBe(category)
  })

  it('skips events without a UID or a usable start', () => {
    const [noUid] = parseIcsEvents(
      calendar(
        'x',
        KOREA_EVENT.filter((l) => !l.startsWith('UID'))
      )
    )
    const [floating] = parseIcsEvents(
      calendar(
        'x',
        KOREA_EVENT.map((l) => (l.startsWith('DTSTART') ? 'DTSTART:20261017T050000' : l))
      )
    )
    const ctx = { chain: 'avalanche', calendarName: 'x' }
    expect(mapLumaEvent(noUid!, ctx)).toEqual({ skippedReason: 'missing UID' })
    expect(mapLumaEvent(floating!, ctx)).toEqual({
      skippedReason: 'start time missing or unsupported',
    })
  })
})

describe('LumaCalendarAdapter', () => {
  it('fetches the calendar export and reports NOT_MODIFIED when only DTSTAMP changed', async () => {
    const body = calendar('Team1 Korea', KOREA_EVENT, CHILE_EVENT)
    const fetchFn = vi.fn(async (_url: string) => new Response(body))
    const adapter = new LumaCalendarAdapter(fetchFn)

    const first = await adapter.collect(source)
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://api.lu.ma/ics/get?entity=calendar&id=cal-pE5SNzqEFCTNpRU'
    )
    expect(first.status).toBe('SUCCESS')
    expect(first.events.map((e) => e.eventKey)).toEqual([
      'luma-evt-5I3vezpRHD0bJ1z',
      'luma-evt-chile',
    ])

    const restamped = new LumaCalendarAdapter(
      async () => new Response(body.replace('DTSTAMP:20261012T141107Z', 'DTSTAMP:20261013T000000Z'))
    )
    expect((await restamped.collect(source, first.cursor)).status).toBe('NOT_MODIFIED')

    const changed = new LumaCalendarAdapter(
      async () => new Response(body.replace('20261017T050000Z', '20261018T050000Z'))
    )
    expect((await changed.collect(source, first.cursor)).status).toBe('SUCCESS')
  })

  it('fails clearly on an HTTP error or a non-calendar response', async () => {
    await expect(
      new LumaCalendarAdapter(async () => new Response('', { status: 404 })).collect(source)
    ).rejects.toThrow('Luma calendar request failed: 404')
    await expect(
      new LumaCalendarAdapter(async () => new Response('<html>blocked</html>')).collect(source)
    ).rejects.toThrow('not an iCalendar document')
  })

  it('requires the luma config', async () => {
    await expect(
      new LumaCalendarAdapter(async () => new Response('')).collect({ ...source, luma: undefined })
    ).rejects.toThrow('requires adapter=LUMA_ICS')
  })
})
