import { describe, expect, it } from 'vitest'

import { cleanTags, nonEmpty, safePublicUrl } from '../src/events/sanitize.js'

describe('safePublicUrl', () => {
  it('keeps ordinary public links', () => {
    expect(safePublicUrl(' https://luma.com/f95ppglk ')).toBe('https://luma.com/f95ppglk')
    expect(safePublicUrl('https://build.avax.network/events?ref=x')).toBe(
      'https://build.avax.network/events?ref=x'
    )
  })

  it.each([
    ['no scheme (frontend url() rejects it)', 'lu.ma/abc'],
    ['not http', 'javascript:alert(1)'],
    ['a zoom meeting', 'https://us02web.zoom.us/j/123456'],
    ['a google meet', 'https://meet.google.com/abc-defg-hij'],
    ['a meeting password', 'https://example.com/join?pwd=abc'],
    ['an access token', 'https://example.com/e?access_token=xyz'],
    ['credentials in the URL', 'https://user:pass@example.com/'],
    ['empty', '   '],
  ])('drops %s', (_label, value) => {
    expect(safePublicUrl(value)).toBeNull()
  })
})

describe('cleanTags', () => {
  it('trims, drops empty and duplicate tags, and caps the list', () => {
    expect(cleanTags([' Avalanche ', '', 'avalanche', 'Seoul', 3, '  '])).toEqual([
      'Avalanche',
      'Seoul',
    ])
    expect(cleanTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10)
  })
})

describe('nonEmpty', () => {
  it('turns blank strings into null so min(1) fields never get ""', () => {
    expect(nonEmpty('  ', 10)).toBeNull()
    expect(nonEmpty(' Team1 Korea ', 5)).toBe('Team1')
  })
})
