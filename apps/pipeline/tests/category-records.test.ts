import { describe, expect, it } from 'vitest'

import { buildCategoryRecord, type RecordArticle } from '../src/classify/category-records.js'
import { classificationSchema, type Classification } from '../src/classify/schema.js'

const article: RecordArticle = {
  id: 'a1',
  title: 'Crypto House Seoul announced',
  publishedAt: new Date('2026-10-20T00:00:00Z'),
  contentKind: 'SOCIAL',
  chain: 'avalanche',
}

function classification(partial: Record<string, unknown>): Classification {
  return classificationSchema.parse({
    category: 'EVENT',
    importance: 3,
    summary_ko: '요약',
    ...partial,
  })
}

const goodEvent = {
  name: "Crypto House Seoul '26",
  starts_at: '2026-11-28T14:00:00+09:00',
  timezone: 'Asia/Seoul',
  city: 'Seoul',
  country: 'kr',
  category: 'COMMUNITY',
  tags: ['Avalanche'],
  confidence: 0.9,
}

describe('buildCategoryRecord: events', () => {
  it('builds a full event row with a stable key and an upper-cased country', () => {
    const { record } = buildCategoryRecord(
      article,
      classification({ event: goodEvent }),
      'https://x/1'
    )

    expect(record).toMatchObject({
      type: 'EVENT',
      eventKey: 'crypto-house-seoul-26-2026-11-28',
      title: "Crypto House Seoul '26",
      startsAt: '2026-11-28T14:00:00+09:00',
      timezone: 'Asia/Seoul',
      country: 'KR',
      isOnline: false,
      sourceUrl: 'https://x/1',
      confidence: 0.9,
    })
  })

  it('keeps the post date and the event date separate', () => {
    const { record } = buildCategoryRecord(article, classification({ event: goodEvent }), 'u')

    expect(record?.type === 'EVENT' && record.publishedAt.toISOString()).toBe(
      '2026-10-20T00:00:00.000Z'
    )
  })

  it.each([
    ['no start date', { ...goodEvent, starts_at: null }, 'start date not confirmed'],
    ['no timezone', { ...goodEvent, timezone: null }, 'timezone missing'],
    ['an invalid timezone', { ...goodEvent, timezone: 'Mars/Olympus' }, 'timezone missing'],
    [
      'a date years away from the post',
      { ...goodEvent, starts_at: '2029-11-28T14:00:00+09:00' },
      'implausibly far',
    ],
  ])('skips an event with %s instead of guessing', (_label, event, reason) => {
    const result = buildCategoryRecord(article, classification({ event }), 'u')

    expect(result.record).toBeNull()
    expect(result.skippedReason).toContain(reason)
  })

  it('drops an end date that is before the start and an invalid country code', () => {
    const { record } = buildCategoryRecord(
      article,
      classification({
        event: { ...goodEvent, ends_at: '2026-11-27T10:00:00+09:00', country: 'Korea' },
      }),
      'u'
    )

    expect(record).toMatchObject({ endsAt: null, country: null })
  })

  it('falls back to a hash key when the name has no latin letters', () => {
    const { record } = buildCategoryRecord(
      article,
      classification({ event: { ...goodEvent, name: '아발란체 서울 밋업' } }),
      'u'
    )

    expect(record?.type === 'EVENT' && record.eventKey).toMatch(/^[0-9a-f]{10}-2026-11-28$/)
  })

  it('carries CANCELLED/POSTPONED through as an override', () => {
    const { record } = buildCategoryRecord(
      article,
      classification({ event: { ...goodEvent, status: 'POSTPONED' } }),
      'u'
    )

    expect(record?.type === 'EVENT' && record.statusOverride).toBe('POSTPONED')
  })
})

describe('buildCategoryRecord: other categories', () => {
  it('maps the source content kind onto the tech update kind', () => {
    const tech = { network: 'FUJI', upgrade_name: 'Granite', version: 'v1.14', activated_at: null }
    const cases: [string, string][] = [
      ['RELEASE', 'RELEASE'],
      ['GOVERNANCE', 'ACP'],
      ['BLOG', 'BLOG'],
      ['SOCIAL', 'OTHER'],
    ]
    for (const [contentKind, kind] of cases) {
      const { record } = buildCategoryRecord(
        { ...article, contentKind },
        classification({ category: 'TECH_UPDATE', tech }),
        'u'
      )
      expect(record).toMatchObject({
        type: 'TECH_UPDATE',
        kind,
        network: 'FUJI',
        upgradeName: 'Granite',
      })
    }
  })

  it('builds a macro row and falls back to the article title', () => {
    const { record } = buildCategoryRecord(
      article,
      classification({
        category: 'MACRO',
        macro: { kind: 'COLLAB', related_project: 'Kite AI' },
      }),
      'u'
    )

    expect(record).toMatchObject({
      type: 'MACRO',
      kind: 'COLLAB',
      relatedProject: 'Kite AI',
      title: 'Crypto House Seoul announced',
    })
  })

  it('stores GENERAL posts and drops NOISE', () => {
    const general = buildCategoryRecord(
      article,
      classification({ category: 'GENERAL', title_ko: 'Fuji 테스트넷은 왜 있나' }),
      'u'
    )
    expect(general.record).toMatchObject({
      type: 'GENERAL',
      chain: 'avalanche',
      title: 'Fuji 테스트넷은 왜 있나',
      summary: '요약',
      importance: 3,
    })

    expect(buildCategoryRecord(article, classification({ category: 'NOISE' }), 'u')).toEqual({
      record: null,
    })
  })

  it('rejects the retired OTHER category', () => {
    expect(() => classification({ category: 'OTHER' })).toThrow()
  })

  it('stamps every row with the source chain', () => {
    const other = { ...article, chain: 'itest-chain' }
    const macro = buildCategoryRecord(other, classification({ category: 'MACRO' }), 'u').record
    const event = buildCategoryRecord(other, classification({ event: goodEvent }), 'u').record

    expect(macro?.chain).toBe('itest-chain')
    expect(event?.chain).toBe('itest-chain')
  })

  it('drops unsafe or malformed links and empty tags the model returns', () => {
    const { record } = buildCategoryRecord(
      article,
      classification({
        event: {
          ...goodEvent,
          registration_url: 'https://us02web.zoom.us/j/1?pwd=secret',
          tags: ['', ' Avalanche ', 'avalanche'],
          organizer: '   ',
        },
      }),
      'https://x.com/Team1KOR/status/1'
    )

    expect(record).toMatchObject({ registrationUrl: null, tags: ['Avalanche'], organizer: null })
  })
})
