import { describe, expect, it } from 'vitest'

import { normalizeTitle, startsMatch, titlesMatch } from '../src/events/dedup.js'

describe('titlesMatch', () => {
  it.each([
    ['Univ Connect: Aidenteti Crew', 'Univ Connect: Aidenteti Crew'],
    ['Univ Connect: Aidenteti Crew', '[Team1 Korea] Univ Connect: Aidenteti Crew 신청 오픈!'],
    ["Crypto House Seoul '26", 'Crypto House Seoul 26'],
    ['월간 아발란체 9월', '월간 아발란체 9월 (Avalanche Monthly Updates: September)'],
  ])('treats "%s" and "%s" as the same event', (a, b) => {
    expect(titlesMatch(a, b)).toBe(true)
  })

  it.each([
    ['Univ Connect: Aidenteti Crew', 'Univ Connect: KAIST Orakle'],
    ['Builder Workshop: Claude & x402', 'Builder Workshop: AI Agent Payments - Q402'],
    ['Meetup', 'Avalanche Meetup Lagos'],
    ['Team1 Korea 이벤트', 'Univ Connect: Aidenteti Crew'],
  ])('keeps "%s" and "%s" apart', (a, b) => {
    expect(titlesMatch(a, b)).toBe(false)
  })

  it('ignores case, punctuation and emoji', () => {
    expect(normalizeTitle('🔺 AMRC #2: Run for Good!')).toBe('amrc 2 run for good')
  })
})

describe('startsMatch', () => {
  const seoul = 'Asia/Seoul'

  it('matches timed events within two hours, not beyond', () => {
    const a = { startsAt: '2026-11-25T10:00:00+09:00', allDay: false, timezone: seoul }
    expect(startsMatch(a, { ...a, startsAt: '2026-11-25T11:30:00+09:00' })).toBe(true)
    expect(startsMatch(a, { ...a, startsAt: '2026-11-25T13:00:00+09:00' })).toBe(false)
  })

  it('matches a date-only notice to the timed calendar entry on the same local day', () => {
    const notice = { startsAt: '2026-11-25T00:00:00+09:00', allDay: true, timezone: seoul }
    const calendar = { startsAt: '2026-11-25T18:30:00+09:00', allDay: false, timezone: seoul }
    expect(startsMatch(notice, calendar)).toBe(true)
    expect(startsMatch(calendar, notice)).toBe(true)
  })

  it('keeps a date-only notice apart from an event on the next local day', () => {
    const notice = { startsAt: '2026-11-25T00:00:00+09:00', allDay: true, timezone: seoul }
    // 2026-11-26 01:00 in Seoul is still 11-25 in UTC; the day is read in Seoul time.
    const nextDay = { startsAt: '2026-11-25T16:00:00Z', allDay: false, timezone: 'UTC' }
    expect(startsMatch(notice, nextDay)).toBe(false)
  })
})
