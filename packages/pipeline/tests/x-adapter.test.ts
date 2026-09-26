import { describe, expect, it } from 'vitest'

import { XApiAdapter } from '../src/adapters/x-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'

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

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

describe('XApiAdapter', () => {
  it('resolves the username, fetches tweets, and advances the cursor to newest_id', async () => {
    const requestedUrls: string[] = []
    const adapter = new XApiAdapter(
      async (input: string, init?: RequestInit) => {
        requestedUrls.push(input)
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token')
        if (input.includes('/users/by/username/avax')) {
          return response({ data: { id: 'user-1', username: 'avax' } })
        }
        return response({
          data: [
            { id: 'tweet-2', text: 'Second post', created_at: '2026-09-26T00:00:00Z' },
            { id: 'tweet-1', text: 'First post', created_at: '2026-09-25T00:00:00Z' },
          ],
          meta: { newest_id: 'tweet-2', result_count: 2 },
        })
      },
      'https://api.x.com',
      'test-token'
    )

    const result = await adapter.collect(source, {})

    expect(result.status).toBe('SUCCESS')
    expect(result.cursor).toEqual({ value: 'tweet-2' })
    expect(result.articles).toHaveLength(2)
    expect(result.articles[0]).toMatchObject({
      guid: 'tweet-2',
      title: 'Second post',
      url: 'https://x.com/avax/status/tweet-2',
      author: 'avax',
      body: 'Second post',
    })
    expect(requestedUrls.some((u) => u.includes('exclude=retweets'))).toBe(true)
    expect(requestedUrls.some((u) => u.includes('/users/user-1/tweets'))).toBe(true)
  })

  it('passes since_id from the cursor to only request newer tweets', async () => {
    const requestedUrls: string[] = []
    const adapter = new XApiAdapter(
      async (input: string) => {
        requestedUrls.push(input)
        if (input.includes('/users/by/username/')) return response({ data: { id: 'user-1' } })
        return response({ data: [], meta: { result_count: 0 } })
      },
      'https://api.x.com',
      'test-token'
    )

    const result = await adapter.collect(source, { value: 'tweet-2' })

    expect(result.status).toBe('NOT_MODIFIED')
    expect(requestedUrls.some((u) => u.includes('since_id=tweet-2'))).toBe(true)
  })

  it('throws a clear error when the bearer token is missing', async () => {
    const adapter = new XApiAdapter(async () => response({}), 'https://api.x.com', undefined)
    await expect(adapter.collect(source, {})).rejects.toThrow('X_BEARER_TOKEN is not configured')
  })

  it('raises an explicit error for authentication failures', async () => {
    const adapter = new XApiAdapter(
      async () => new Response(null, { status: 401 }),
      'https://api.x.com',
      'test-token'
    )
    await expect(adapter.collect(source, {})).rejects.toThrow('X API authentication failed (401)')
  })

  it('raises an explicit error for rate limiting', async () => {
    const adapter = new XApiAdapter(
      async () => new Response(null, { status: 429, headers: { 'x-rate-limit-reset': '1234' } }),
      'https://api.x.com',
      'test-token'
    )
    await expect(adapter.collect(source, {})).rejects.toThrow('X API rate limited (429)')
  })
})
