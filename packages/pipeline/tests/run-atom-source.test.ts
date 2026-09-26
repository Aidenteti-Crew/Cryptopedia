import { describe, expect, it } from 'vitest'

import { AtomAdapter } from '../src/adapters/atom-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { runAtomSource } from '../src/jobs/run-atom-source.js'
import { FakeContentDb } from './support/fake-content-db.js'

const source: SourceConfig = {
  url: 'https://github.com/ava-labs/avalanchego/releases.atom',
  sourceName: 'AvalancheGo Releases',
  sourceType: 'RSS',
  adapter: 'ATOM',
  contentKind: 'RELEASE',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
}

function feedXml(
  entries: { id?: string; title: string; url: string; published: string }[]
): string {
  const body = entries
    .map(
      (e) => `
      <entry>
        ${e.id ? `<id>${e.id}</id>` : ''}
        <title>${e.title}</title>
        <published>${e.published}</published>
        <link rel="alternate" href="${e.url}"/>
        <content>Release notes for ${e.title}</content>
      </entry>`
    )
    .join('')
  return `<?xml version="1.0"?><feed>${body}</feed>`
}

function jsonResponse(xml: string, headers: Record<string, string> = {}): Response {
  return new Response(xml, { status: 200, headers: { etag: 'W/"v1"', ...headers } })
}

describe('runAtomSource', () => {
  it('inserts articles on the first run and persists the cursor/etag', async () => {
    const db = new FakeContentDb()
    const xml = feedXml([
      {
        id: 'tag:github.com,2008:Repository/1/v1.15.0',
        title: 'v1.15.0',
        url: 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0',
        published: '2026-09-22T00:00:00Z',
      },
    ])
    const adapter = new AtomAdapter(async () => jsonResponse(xml))

    const result = await runAtomSource(db.query, source, { adapter })

    expect(result).toEqual({
      status: 'SUCCESS',
      sourceId: result.sourceId,
      inserted: 1,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    expect(db.articles).toHaveLength(1)
    const stored = db.sources.find((s) => s.id === result.sourceId)
    expect(stored?.source_meta_json?.['cursor']).toMatchObject({ etag: 'W/"v1"' })
    expect(stored?.last_success_at).not.toBeNull()
  })

  it('does not re-fetch articles or touch the cursor on a 304 response', async () => {
    const db = new FakeContentDb()
    let receivedIfNoneMatch: string | null = null
    const adapter = new AtomAdapter(async (_url, init) => {
      receivedIfNoneMatch = (init?.headers as Headers)?.get?.('If-None-Match') ?? null
      return new Response(null, { status: 304 })
    })

    await runAtomSource(db.query, source, { adapter })
    // Seed a cursor as if a previous successful run had set one.
    const sourceRow = db.sources[0]!
    sourceRow.source_meta_json = { cursor: { etag: 'W/"cached"' } }

    const result = await runAtomSource(db.query, source, { adapter })

    expect(result.status).toBe('NOT_MODIFIED')
    expect(receivedIfNoneMatch).toBe('W/"cached"')
    expect(db.articles).toHaveLength(0)
  })

  it('records a failure and leaves the cursor untouched when the fetch throws', async () => {
    const db = new FakeContentDb()
    const adapter = new AtomAdapter(async () => {
      throw new Error('network down')
    })

    await expect(runAtomSource(db.query, source, { adapter })).rejects.toThrow('network down')

    const sourceRow = db.sources[0]!
    expect(sourceRow.consecutive_failures).toBe(1)
    expect(sourceRow.last_error_msg).toBe('network down')
    expect(sourceRow.source_meta_json?.['cursor']).toBeUndefined()
  })

  // Phase 1 completion condition (architecture.md §10): this pipeline and the existing
  // news_collector agent_comm insert path must not both store the same article. They share
  // content.article_raw's uq_article_raw_representative_key_hash index; FakeContentDb models
  // that index and news_collector's actual insert SQL shape (see fake-content-db.ts) so this
  // runs without a live Postgres. It should be re-run against a real database once one is
  // available in this environment — see the note in the chat reply.
  it('does not duplicate an article that news_collector already inserted for the same URL', async () => {
    const db = new FakeContentDb()
    const sharedUrl = 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0'

    const newsCollectorResult = await db.newsCollectorInsertArticle({
      url: sharedUrl,
      title: 'v1.15.0',
      sourceName: 'AvalancheGo Releases (RSS)',
      sourceType: 'RSS',
    })
    expect(newsCollectorResult.created).toBe(true)

    // Real GitHub Atom entries include an ID. The representative key must still be the same
    // raw URL that news_collector stores; otherwise this cross-pipeline conflict is missed.
    const xml = feedXml([
      {
        id: 'tag:github.com,2008:Repository/1/v1.15.0',
        title: 'v1.15.0',
        url: sharedUrl,
        published: '2026-09-22T00:00:00Z',
      },
    ])
    const adapter = new AtomAdapter(async () => jsonResponse(xml))

    const result = await runAtomSource(db.query, source, { adapter })

    expect(result.inserted).toBe(0)
    expect(result.skippedDuplicate).toBe(1)
    expect(db.articles).toHaveLength(1)
  })

  it('does not let news_collector duplicate an article this pipeline already inserted', async () => {
    const db = new FakeContentDb()
    const sharedUrl = 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0'
    const xml = feedXml([
      {
        id: 'tag:github.com,2008:Repository/1/v1.15.0',
        title: 'v1.15.0',
        url: sharedUrl,
        published: '2026-09-22T00:00:00Z',
      },
    ])
    const adapter = new AtomAdapter(async () => jsonResponse(xml))

    const result = await runAtomSource(db.query, source, { adapter })
    expect(result.inserted).toBe(1)

    const newsCollectorResult = await db.newsCollectorInsertArticle({
      url: sharedUrl,
      title: 'v1.15.0',
      sourceName: 'AvalancheGo Releases (RSS)',
      sourceType: 'RSS',
    })

    expect(newsCollectorResult.created).toBe(false)
    expect(db.articles).toHaveLength(1)
  })
})
