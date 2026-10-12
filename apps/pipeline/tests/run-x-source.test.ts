import { describe, expect, it } from 'vitest'

import { XApiAdapter } from '../src/adapters/x-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { runXSource } from '../src/jobs/run-x-source.js'
import { FakeContentDb } from './support/fake-content-db.js'

const source: SourceConfig = {
  url: 'https://x.com/avax',
  sourceName: 'Avalanche X',
  sourceType: 'TWITTER',
  adapter: 'X_API',
  contentKind: 'SOCIAL',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body))
}

describe('runXSource', () => {
  it('persists new tweets and advances the cursor after a successful insert', async () => {
    const db = new FakeContentDb()
    const adapter = new XApiAdapter(
      async (input: string) => {
        if (input.includes('/users/by/username/')) return response({ data: { id: 'user-1' } })
        return response({
          data: [{ id: 'tweet-1', text: 'Announcement text', created_at: '2026-09-26T00:00:00Z' }],
          meta: { newest_id: 'tweet-1' },
        })
      },
      'https://api.x.com',
      'test-token'
    )

    const result = await runXSource(db.query, source, adapter)

    expect(result.inserted).toBe(1)
    // buildRepresentativeKey always uses article.url (see normalize.ts) to stay compatible with
    // news_collector's representative_key convention.
    expect(db.articles[0]?.representative_key).toBe('https://x.com/avax/status/tweet-1')
    expect(db.sources[0]?.source_meta_json?.['cursor']).toEqual({ value: 'tweet-1' })
  })

  it('records a failure without advancing the cursor when the adapter throws', async () => {
    const db = new FakeContentDb()
    const adapter = new XApiAdapter(
      async () => new Response(null, { status: 401 }),
      'https://api.x.com',
      'test-token'
    )

    await expect(runXSource(db.query, source, adapter)).rejects.toThrow(
      'X API authentication failed'
    )
    expect(db.sources[0]?.consecutive_failures).toBe(1)
    expect(db.sources[0]?.source_meta_json?.['cursor']).toBeUndefined()
  })
})
