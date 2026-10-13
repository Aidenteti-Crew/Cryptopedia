import { describe, expect, it } from 'vitest'

import { normalizeTitle, titlesMatch } from '../src/events/dedup.js'

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
