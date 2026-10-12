import { describe, expect, it } from 'vitest'

import { insertArticles } from '../src/db/article-repository.js'
import { getOrCreateSource } from '../src/db/source-repository.js'
import type { NormalizedArticle } from '../src/ingestion/contracts.js'
import { FakeContentDb } from './support/fake-content-db.js'

function article(overrides: Partial<NormalizedArticle> = {}): NormalizedArticle {
  return {
    sourceUrl: 'https://example.com/feed.atom',
    adapter: 'ATOM',
    contentKind: 'RELEASE',
    authority: 'OFFICIAL',
    title: 'Release 1',
    url: 'https://example.com/releases/1',
    normalizedUrl: 'https://example.com/releases/1',
    guid: 'tag:example.com,2026:release-1',
    body: 'Release notes',
    publishedAt: '2026-09-25T00:00:00Z',
    ...overrides,
  }
}

describe('article-repository', () => {
  it('inserts new articles and skips exact re-runs via ON CONFLICT DO NOTHING', async () => {
    const db = new FakeContentDb()
    const { id: sourceId } = await getOrCreateSource(db.query, {
      urlHandle: 'https://example.com/feed.atom',
      name: 'Example',
      type: 'RSS',
    })

    const firstRun = await insertArticles(db.query, sourceId, [article()])
    expect(firstRun).toEqual({ inserted: 1, skippedDuplicate: 0 })

    const secondRun = await insertArticles(db.query, sourceId, [article()])
    expect(secondRun).toEqual({ inserted: 0, skippedDuplicate: 1 })
    expect(db.articles).toHaveLength(1)
  })

  it('dedups distinct entries carrying the same guid', async () => {
    const db = new FakeContentDb()
    const { id: sourceId } = await getOrCreateSource(db.query, {
      urlHandle: 'https://example.com/feed.atom',
      name: 'Example',
      type: 'RSS',
    })

    const result = await insertArticles(db.query, sourceId, [
      article({ guid: 'tag:example.com,2026:release-1', title: 'Release 1' }),
      article({
        guid: 'tag:example.com,2026:release-1',
        title: 'Release 1 (edited title from a later feed poll)',
      }),
    ])

    expect(result).toEqual({ inserted: 1, skippedDuplicate: 1 })
  })

  // Regression test: a real ACP author list ("Name ([@handle](url)), ...", x4 co-authors)
  // exceeded content.article_raw.author's VARCHAR(255) against a real Postgres instance and
  // aborted the whole insertArticles loop. FakeContentDb doesn't enforce column length, so this
  // asserts the defensive truncate() call directly rather than relying on a length violation.
  it('truncates title/author/url fields to their VARCHAR column limits', async () => {
    const db = new FakeContentDb()
    const { id: sourceId } = await getOrCreateSource(db.query, {
      urlHandle: 'https://example.com/feed.atom',
      name: 'Example',
      type: 'RSS',
    })

    await insertArticles(db.query, sourceId, [
      article({
        title: 'x'.repeat(600),
        author: 'y'.repeat(300),
      }),
    ])

    expect(db.articles[0]?.title).toHaveLength(500)
    expect(db.articles[0]?.author).toHaveLength(255)
  })
})
