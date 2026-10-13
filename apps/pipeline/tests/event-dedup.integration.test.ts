import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EventRecord } from '../src/classify/category-records.js'
import { insertArticles } from '../src/db/article-repository.js'
import { absorbDuplicateEvents, upsertChainEvents } from '../src/db/chain-event-repository.js'
import { fetchPendingArticles, insertCategoryRecord } from '../src/db/classification-repository.js'
import { createPgConnection, type PgConnection } from '../src/db/pg-pool.js'
import { getOrCreateSource } from '../src/db/source-repository.js'
import type { ChainEventInput } from '../src/events/types.js'

// Needs Postgres with the avalanche-categories migration (TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL
const TAG = `itest-dedup-${Date.now()}`
const SOURCE_URL = `https://example.com/${TAG}`

function calendarEvent(chain: string, title: string, startsAt: string): ChainEventInput {
  return {
    chain,
    eventKey: `luma-${chain}-${title.length}`,
    title,
    summary: 'Hosted by Team1 Korea',
    startsAt: new Date(startsAt),
    endsAt: null,
    timezone: 'Asia/Seoul',
    allDay: false,
    organizer: 'Team1 Korea',
    venueName: null,
    venueAddress: null,
    city: 'Seoul',
    country: 'KR',
    isOnline: false,
    sourceUrl: 'https://luma.com/f95ppglk',
    registrationUrl: null,
    category: 'COMMUNITY',
    tags: [],
    statusOverride: null,
    confidence: 1,
    publishedAt: null,
  }
}

function postEvent(chain: string, title: string, startsAt: string, url: string): EventRecord {
  return {
    type: 'EVENT',
    chain,
    eventKey: `${title.toLowerCase().replace(/\W+/g, '-')}-${startsAt.slice(0, 10)}`,
    title,
    summary: '요약',
    startsAt,
    endsAt: null,
    timezone: 'Asia/Seoul',
    allDay: false,
    organizer: null,
    venueName: null,
    venueAddress: null,
    city: null,
    country: 'KR',
    isOnline: false,
    sourceUrl: url,
    registrationUrl: null,
    category: 'COMMUNITY',
    tags: [],
    statusOverride: null,
    confidence: 0.8,
    importance: 2,
    publishedAt: new Date('2026-10-10T00:00:00Z'),
  }
}

describe.skipIf(!url)('cross-source event dedup (real Postgres)', () => {
  let connection: PgConnection
  let articleId: string
  const chains = [`${TAG}-a`, `${TAG}-b`, `${TAG}-c`]

  const activeEvents = async (chain: string) =>
    (
      await connection.query(
        'SELECT event_key FROM content.chain_event WHERE chain = $1 AND revoked_at IS NULL',
        [chain]
      )
    ).rows.map((r) => r.event_key)
  const sources = async (chain: string) =>
    (
      await connection.query(
        `SELECT s.source_url FROM content.chain_event_source s
           JOIN content.chain_event e ON e.id = s.chain_event_id WHERE e.chain = $1`,
        [chain]
      )
    ).rows.map((r) => r.source_url)

  beforeAll(async () => {
    connection = createPgConnection(url!)
    const source = await getOrCreateSource(connection.query, {
      urlHandle: SOURCE_URL,
      name: TAG,
      type: 'TWITTER',
    })
    await insertArticles(connection.query, source.id, [
      {
        sourceUrl: SOURCE_URL,
        adapter: 'APIFY',
        contentKind: 'SOCIAL',
        authority: 'OFFICIAL_COMMUNITY',
        guid: TAG,
        title: 'post',
        url: `${SOURCE_URL}/status/1`,
        normalizedUrl: `${SOURCE_URL}/status/1`,
        body: 'body',
        publishedAt: '2026-10-10T00:00:00Z',
      },
    ])
    const [pending] = await fetchPendingArticles(connection.query, {
      sourceUrls: [SOURCE_URL],
      limit: 1,
      maxAttempts: 3,
    })
    articleId = pending!.id
  })

  afterAll(async () => {
    const q = connection.query
    await q(
      `DELETE FROM content.chain_event_source WHERE chain_event_id IN
         (SELECT id FROM content.chain_event WHERE chain = ANY($1::text[]))`,
      [chains]
    )
    await q('DELETE FROM content.chain_event WHERE chain = ANY($1::text[])', [chains])
    await q('DELETE FROM content.article_raw WHERE id = $1', [articleId])
    await q('DELETE FROM content.source WHERE url_handle = $1', [SOURCE_URL])
    await connection.close()
  })

  it('a post about a calendar event becomes a source of it, not a second event', async () => {
    const chain = chains[0]!
    await upsertChainEvents(connection.query, [
      calendarEvent(chain, 'Univ Connect: Aidenteti Crew', '2026-10-17T05:00:00Z'),
    ])

    const created = await insertCategoryRecord(
      connection.query,
      articleId,
      postEvent(
        chain,
        '[Team1 Korea] Univ Connect: Aidenteti Crew',
        '2026-10-17T14:00:00+09:00',
        'https://x.com/Team1KOR/status/1'
      )
    )

    expect(created).toBe(false)
    expect(await activeEvents(chain)).toHaveLength(1)
    expect(await sources(chain)).toEqual(['https://x.com/Team1KOR/status/1'])
  })

  it('a calendar import folds an earlier post-derived event into the calendar row', async () => {
    const chain = chains[1]!
    expect(
      await insertCategoryRecord(
        connection.query,
        articleId,
        postEvent(
          chain,
          'Univ Connect: Aidenteti Crew',
          '2026-10-17T14:00:00+09:00',
          'https://x.com/Team1KOR/status/2'
        )
      )
    ).toBe(true)
    await upsertChainEvents(connection.query, [
      calendarEvent(chain, 'Univ Connect: Aidenteti Crew', '2026-10-17T05:00:00Z'),
    ])

    expect(await absorbDuplicateEvents(connection.query, chain)).toBe(1)
    const active = await activeEvents(chain)
    expect(active).toHaveLength(1)
    expect(active[0]).toMatch(/^luma-/)
    expect(await sources(chain)).toEqual(['https://x.com/Team1KOR/status/2'])
    // Running it again changes nothing.
    expect(await absorbDuplicateEvents(connection.query, chain)).toBe(0)
  })

  it('keeps events apart when the time or the title differs', async () => {
    const chain = chains[2]!
    await upsertChainEvents(connection.query, [
      calendarEvent(chain, 'Univ Connect: Aidenteti Crew', '2026-10-17T05:00:00Z'),
    ])

    await insertCategoryRecord(
      connection.query,
      articleId,
      postEvent(
        chain,
        'Univ Connect: Aidenteti Crew',
        '2026-10-24T14:00:00+09:00',
        'https://x.com/a'
      )
    )
    await insertCategoryRecord(
      connection.query,
      articleId,
      postEvent(chain, 'Univ Connect: KAIST Orakle', '2026-10-17T14:00:00+09:00', 'https://x.com/b')
    )

    expect(await activeEvents(chain)).toHaveLength(3)
  })
})
