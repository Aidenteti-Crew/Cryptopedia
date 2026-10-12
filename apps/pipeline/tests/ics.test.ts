import { describe, expect, it } from 'vitest'

import { parseIcsDate, parseIcsEvents, unescapeText } from '../src/events/ics.js'
import { countryCodeFromName, zonedTimeToInstant } from '../src/events/time.js'
import { calendar, KOREA_EVENT } from './support/luma-fixture.js'

describe('parseIcsEvents', () => {
  it('unfolds lines (including mid-word and inside Korean text) and reads parameters', () => {
    const [ev] = parseIcsEvents(calendar('Team1 Korea', KOREA_EVENT))

    expect(ev?.UID?.value).toBe('evt-5I3vezpRHD0bJ1z@events.lu.ma')
    expect(ev?.ORGANIZER?.params.CN).toBe('Team1 Korea')
    expect(ev?.ORGANIZER?.value).toBe('MAILTO:calendar-invite@lu.ma')
    expect(unescapeText(ev?.LOCATION?.value ?? '')).toContain('77 서울용산시제품제작소 2층, 3층')
    expect(unescapeText(ev?.DESCRIPTION?.value ?? '')).toContain(
      'Address:\n서울용산시제품제작소\nSeoul, South Korea'
    )
  })

  it('ignores properties outside VEVENT and keeps the first of a repeated property', () => {
    const events = parseIcsEvents(
      calendar('x', ['BEGIN:VEVENT', 'UID:a', 'SUMMARY:first', 'SUMMARY:second', 'END:VEVENT'])
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.SUMMARY?.value).toBe('first')
  })
})

describe('parseIcsDate', () => {
  it('reads UTC times, all-day dates and zoned local times, and rejects floating times', () => {
    expect(parseIcsDate({ value: '20261017T050000Z', params: {} })?.instant?.toISOString()).toBe(
      '2026-10-17T05:00:00.000Z'
    )
    expect(parseIcsDate({ value: '20261017', params: { VALUE: 'DATE' } })?.date).toBe('2026-10-17')
    expect(
      parseIcsDate({ value: '20261017T140000', params: { TZID: 'Asia/Seoul' } })?.local
    ).toEqual({
      wallClock: '2026-10-17T14:00:00',
      timeZone: 'Asia/Seoul',
    })
    expect(parseIcsDate({ value: '20261017T140000', params: {} })).toBeNull()
    expect(parseIcsDate({ value: 'tomorrow', params: {} })).toBeNull()
  })
})

describe('zonedTimeToInstant', () => {
  it.each([
    ['2026-11-28T00:00:00', 'Asia/Seoul', '2026-11-27T15:00:00.000Z'],
    ['2026-07-04T12:00:00', 'America/New_York', '2026-07-04T16:00:00.000Z'],
    ['2026-12-04T12:00:00', 'America/New_York', '2026-12-04T17:00:00.000Z'],
    // the day US clocks go back: 09:00 is already EST
    ['2026-11-01T09:00:00', 'America/New_York', '2026-11-01T14:00:00.000Z'],
    ['2026-10-17T10:30:00', 'Asia/Kolkata', '2026-10-17T05:00:00.000Z'],
  ])('%s in %s', (wall, zone, expected) => {
    expect(zonedTimeToInstant(wall, zone).toISOString()).toBe(expected)
  })
})

describe('countryCodeFromName', () => {
  it('maps English country names to ISO codes, preferring current codes', () => {
    expect(countryCodeFromName('South Korea')).toBe('KR')
    expect(countryCodeFromName('France')).toBe('FR')
    expect(countryCodeFromName(' nigeria ')).toBe('NG')
    expect(countryCodeFromName('Türkiye')).toBe('TR')
    expect(countryCodeFromName('Turkey')).toBe('TR')
    // Retired codes Intl still labels with a current name must not win.
    expect(countryCodeFromName('Vietnam')).toBe('VN')
    expect(countryCodeFromName('The Gambia')).toBe('GM')
    expect(countryCodeFromName('Región Metropolitana')).toBeNull()
    expect(countryCodeFromName('')).toBeNull()
  })
})
