import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createPgConnection, type PgConnection } from '../src/db/pg-pool.js'
import { attachEventCovers, eventUsCoverUrl } from '../src/events/event-covers.js'

const COVER =
  'https://eventusstorage.blob.core.windows.net/evs/Image/2026bcmd/129799/ProjectInfo/Cover/0366.JPG?fit=640%2C360'
const page = (image: string) => `<head><meta property="og:image" content="${image}" /></head>`

describe('eventUsCoverUrl', () => {
  it('reads the cover from Eventus storage only', () => {
    expect(eventUsCoverUrl(page(COVER))).toBe(COVER)
    expect(eventUsCoverUrl(page('https://evil.example/x.jpg'))).toBeNull()
    expect(eventUsCoverUrl('<head></head>')).toBeNull()
  })
})

// Needs Postgres with the chain_event table (TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL
const CHAIN = `itest-covers-${Date.now()}`

describe.skipIf(!url)('attachEventCovers (real Postgres)', () => {
  let connection: PgConnection

  const insert = (key: string, registrationUrl: string | null, startsAt: string) =>
    connection.query(
      `INSERT INTO content.chain_event (id, chain, event_key, title, summary, starts_at, timezone,
         all_day, is_online, registration_url, category, tags)
       VALUES (gen_random_uuid(), $1, $2, $2, '', $3, 'Asia/Seoul', false, false, $4, 'COMMUNITY', '{}')`,
      [CHAIN, key, startsAt, registrationUrl]
    )
  const covers = async () =>
    Object.fromEntries(
      (
        await connection.query(
          'SELECT event_key, image_url FROM content.chain_event WHERE chain = $1',
          [CHAIN]
        )
      ).rows.map((r) => [r.event_key, r.image_url])
    )

  beforeAll(async () => {
    connection = createPgConnection(url!)
    const soon = new Date(Date.now() + 7 * 86_400_000).toISOString()
    await insert('eventus', 'https://event-us.kr/2026bcmd/event/129799', soon)
    await insert('eventus-broken', 'https://event-us.kr/m/1', soon)
    await insert('other-site', 'https://example.com/signup', soon)
    await insert('eventus-past', 'https://event-us.kr/m/2', '2025-01-01T00:00:00Z')
  })

  afterAll(async () => {
    await connection.query('DELETE FROM content.chain_event WHERE chain = $1', [CHAIN])
    await connection.close()
  })

  it('adds the Eventus cover to upcoming events and leaves the rest alone', async () => {
    const fetched: string[] = []
    const fetchFn = async (target: string) => {
      fetched.push(target)
      if (target.endsWith('/129799')) return new Response(page(COVER))
      throw new Error('timed out')
    }
    await attachEventCovers(connection.query, fetchFn, 1000)

    expect(await covers()).toEqual({
      eventus: COVER,
      'eventus-broken': null,
      'other-site': null,
      'eventus-past': null,
    })
    expect(fetched).not.toContain('https://example.com/signup')
    expect(fetched).not.toContain('https://event-us.kr/m/2')
  })
})
