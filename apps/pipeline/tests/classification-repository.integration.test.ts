import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { CategoryRecord } from '../src/classify/category-records.js'
import { classificationSchema } from '../src/classify/schema.js'
import { insertArticles } from '../src/db/article-repository.js'
import {
  fetchPendingArticles,
  insertCategoryRecord,
  saveClassificationFailure,
  saveClassificationSuccess,
} from '../src/db/classification-repository.js'
import { createPgConnection, type PgConnection } from '../src/db/pg-pool.js'
import { getOrCreateSource } from '../src/db/source-repository.js'

// Needs a Postgres with docs/architecture/avalanche-categories-2026-10-12.sql applied:
//   TEST_DATABASE_URL=postgresql://cherry:cherry_dev@localhost:5432/cherry_db pnpm test
// The in-memory fake cannot check ON CONFLICT ... WHERE, the ai_status_enum, or the CHECKs.
const url = process.env.TEST_DATABASE_URL
const TAG = `itest-${Date.now()}`
const SOURCE_URL = `https://example.com/${TAG}/feed`
const EVENT_KEY = `${TAG}-event-2026-11-28`

describe.skipIf(!url)('classification-repository (real Postgres)', () => {
  let connection: PgConnection
  let articleId: string

  beforeAll(async () => {
    connection = createPgConnection(url!)
    const source = await getOrCreateSource(connection.query, {
      urlHandle: SOURCE_URL,
      name: `Itest ${TAG}`,
      type: 'RSS',
    })
    await insertArticles(connection.query, source.id, [
      {
        sourceUrl: SOURCE_URL,
        adapter: 'ATOM',
        contentKind: 'RELEASE',
        authority: 'OFFICIAL',
        guid: TAG,
        title: `Release ${TAG}`,
        url: `https://example.com/${TAG}/1`,
        normalizedUrl: `https://example.com/${TAG}/1`,
        body: 'body',
        publishedAt: '2026-10-01T00:00:00Z',
      },
    ])
    const found = await fetchPendingArticles(connection.query, {
      sourceUrls: [SOURCE_URL],
      limit: 5,
      maxAttempts: 3,
    })
    articleId = found[0]!.id
  })

  afterAll(async () => {
    const q = connection.query
    await q('DELETE FROM content.tech_update WHERE article_raw_id = $1', [articleId])
    await q('DELETE FROM content.macro_news WHERE article_raw_id = $1', [articleId])
    await q('DELETE FROM content.chain_event WHERE event_key = $1', [EVENT_KEY])
    await q('DELETE FROM content.article_classification WHERE article_raw_id = $1', [articleId])
    await q('DELETE FROM content.article_raw WHERE id = $1', [articleId])
    await q('DELETE FROM content.source WHERE url_handle = $1', [SOURCE_URL])
    await connection.close()
  })

  const outcome = (category: string) => {
    const rawJson = { category, importance: 4, summary_ko: '요약' }
    return { classification: classificationSchema.parse(rawJson), rawJson }
  }

  it('only selects articles from the requested sources', async () => {
    const other = await fetchPendingArticles(connection.query, {
      sourceUrls: ['https://example.com/not-this-source'],
      limit: 5,
      maxAttempts: 3,
    })
    expect(other).toEqual([])
  })

  it('retries a FAILED article until attempts run out, and a success removes it from the queue', async () => {
    const pending = () =>
      fetchPendingArticles(connection.query, { sourceUrls: [SOURCE_URL], limit: 5, maxAttempts: 2 })

    expect(await pending()).toHaveLength(1)
    await saveClassificationFailure(connection.query, articleId, 'model exploded', 'm')
    expect(await pending()).toHaveLength(1)
    await saveClassificationFailure(connection.query, articleId, 'again', 'm')
    expect(await pending()).toHaveLength(0)

    await saveClassificationSuccess(connection.query, articleId, outcome('TECH_UPDATE'), 'm')
    const row = await connection.query(
      'SELECT status, category, importance, attempts, error_msg FROM content.article_classification WHERE article_raw_id = $1',
      [articleId]
    )
    expect(row.rows).toEqual([
      { status: 'SUCCESS', category: 'TECH_UPDATE', importance: 4, attempts: 3, error_msg: null },
    ])
    expect(await pending()).toHaveLength(0)
  })

  it('inserts each category row once per article (idempotent re-run)', async () => {
    const tech: CategoryRecord = {
      type: 'TECH_UPDATE',
      chain: 'avalanche',
      kind: 'RELEASE',
      network: 'MAINNET',
      upgradeName: 'Helicon',
      version: 'v1.15.1',
      title: '스냅샷 개선',
      changeSummary: '요약',
      activatedAt: null,
      importance: 3,
      publishedAt: new Date('2026-10-01T00:00:00Z'),
    }
    expect(await insertCategoryRecord(connection.query, articleId, tech)).toBe(true)
    expect(await insertCategoryRecord(connection.query, articleId, tech)).toBe(false)
  })

  it('merges repeated announcements of one event on event_key', async () => {
    const event: CategoryRecord = {
      type: 'EVENT',
      chain: 'avalanche',
      eventKey: EVENT_KEY,
      title: 'Meetup',
      summary: '요약',
      startsAt: '2026-11-28T14:00:00+09:00',
      endsAt: null,
      timezone: 'Asia/Seoul',
      allDay: false,
      organizer: null,
      venueName: null,
      venueAddress: null,
      city: 'Seoul',
      country: 'KR',
      isOnline: false,
      sourceUrl: 'https://example.com/e',
      registrationUrl: null,
      category: 'COMMUNITY',
      tags: ['Avalanche', 'Community'],
      statusOverride: null,
      confidence: 0.9,
      importance: 3,
      publishedAt: new Date('2026-10-20T00:00:00Z'),
    }
    expect(await insertCategoryRecord(connection.query, articleId, event)).toBe(true)
    expect(await insertCategoryRecord(connection.query, articleId, event)).toBe(false)

    const row = await connection.query(
      'SELECT country, tags, timezone FROM content.chain_event WHERE event_key = $1',
      [EVENT_KEY]
    )
    expect(row.rows).toEqual([
      { country: 'KR', tags: ['Avalanche', 'Community'], timezone: 'Asia/Seoul' },
    ])
  })

  it('rejects out-of-range values through the table constraints', async () => {
    await expect(
      connection.query(
        `UPDATE content.article_classification SET importance = 9 WHERE article_raw_id = $1`,
        [articleId]
      )
    ).rejects.toThrow(/ck_acls_importance/)
  })
})
