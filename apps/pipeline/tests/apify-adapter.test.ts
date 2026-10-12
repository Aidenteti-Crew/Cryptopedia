import { describe, expect, it, vi } from 'vitest'

import { ApifyAdapter } from '../src/adapters/apify-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'

const source: SourceConfig = {
  url: 'https://x.com/avax',
  chain: 'avalanche',
  sourceName: 'Avalanche X',
  sourceType: 'TWITTER',
  adapter: 'APIFY',
  contentKind: 'SOCIAL',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  apify: {
    actor: 'apidojo~tweet-scraper',
    input: { startUrls: ['https://x.com/avax'], maxItems: 20 },
    includeRetweets: false,
  },
}

// Shapes copied from a real apidojo/tweet-scraper run against @avax (2026-10-12).
const ORIGINAL = {
  url: 'https://x.com/avax/status/2108211125460557973',
  id: '2108211125460557973',
  text: 'Avalanche checks a lot of the boxes ✅',
  createdAt: 'Thu Oct 08 15:01:15 +0000 2026',
  isRetweet: false,
}
const RETWEET = {
  url: 'https://x.com/avax/status/2108253382989517052',
  id: '2108253382989517052',
  text: 'RT @AvaxTeam1: We shared Team1’s vision &amp; story with attendees at Proof of AI, Seoul.…',
  createdAt: 'Thu Oct 08 17:49:10 +0000 2026',
  isRetweet: true,
}
const NEWEST_RETWEET = {
  ...RETWEET,
  id: '2109471930785157464',
  url: 'https://x.com/avax/status/2109471930785157464',
  createdAt: 'Mon Oct 12 02:31:15 +0000 2026',
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('ApifyAdapter', () => {
  it('calls the actor synchronously and skips retweets by default', async () => {
    const fetchFn = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input).toBe(
        'https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?format=json&clean=true'
      )
      expect(init?.method).toBe('POST')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token')
      expect(JSON.parse(String(init?.body))).toEqual({
        startUrls: ['https://x.com/avax'],
        maxItems: 20,
      })
      return response([NEWEST_RETWEET, ORIGINAL, RETWEET])
    })

    const result = await new ApifyAdapter(fetchFn, 'https://api.apify.com', 'test-token').collect(
      source
    )

    expect(result.status).toBe('SUCCESS')
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({
      guid: '2108211125460557973',
      url: 'https://x.com/avax/status/2108211125460557973',
      title: 'Avalanche checks a lot of the boxes ✅',
      author: 'avax',
      publishedAt: '2026-10-08T15:01:15.000Z',
    })
    // The cursor advances past retweets too, so they are not refetched as "new" next time.
    expect(result.cursor).toEqual({ value: '2109471930785157464' })
  })

  it('treats a "RT @user:" post as a retweet even when isRetweet is not set', async () => {
    const unflagged = { ...RETWEET, isRetweet: undefined, id: '2108253382989517099' }
    const adapter = new ApifyAdapter(
      async () => response([unflagged, ORIGINAL]),
      'https://api.apify.com',
      't'
    )

    const result = await adapter.collect(source)

    expect(result.articles.map((a) => a.guid)).toEqual([ORIGINAL.id])
  })

  it('keeps retweets and decodes HTML entities when includeRetweets is set', async () => {
    const withRetweets: SourceConfig = {
      ...source,
      apify: { ...source.apify!, includeRetweets: true },
    }
    const adapter = new ApifyAdapter(async () => response([RETWEET]), 'https://api.apify.com', 't')

    const result = await adapter.collect(withRetweets)

    expect(result.articles[0]?.body).toContain('Team1’s vision & story')
    expect(result.articles[0]?.body).not.toContain('&amp;')
  })

  it('only returns tweets newer than the cursor, and NOT_MODIFIED when there are none', async () => {
    const adapter = new ApifyAdapter(
      async () => response([ORIGINAL, RETWEET]),
      'https://api.apify.com',
      't'
    )

    const none = await adapter.collect(source, { value: RETWEET.id })
    expect(none).toEqual({ status: 'NOT_MODIFIED', articles: [], cursor: { value: RETWEET.id } })

    const some = await adapter.collect(source, { value: ORIGINAL.id })
    // Only the retweet is newer than the cursor: no articles, but the cursor still advances.
    expect(some.status).toBe('SUCCESS')
    expect(some.articles).toEqual([])
    expect(some.cursor).toEqual({ value: RETWEET.id })
  })

  it('skips "no results" placeholders and malformed items without failing the run', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const adapter = new ApifyAdapter(
      async () => response([{ noResults: true }, { id: '5', text: 'no url or date' }, ORIGINAL]),
      'https://api.apify.com',
      't'
    )

    const result = await adapter.collect(source)
    warn.mockRestore()

    expect(result.articles.map((a) => a.guid)).toEqual([ORIGINAL.id])
  })

  it('raises explicit errors for missing token, auth, usage limit, and bad shapes', async () => {
    const make = (status: number, body: unknown = {}) =>
      new ApifyAdapter(async () => response(body, status), 'https://api.apify.com', 't')

    await expect(
      new ApifyAdapter(async () => response([]), 'https://api.apify.com', undefined).collect(source)
    ).rejects.toThrow('APIFY_TOKEN is not configured')
    await expect(make(401).collect(source)).rejects.toThrow('authentication failed (401)')
    await expect(make(402).collect(source)).rejects.toThrow('usage limit reached (402)')
    await expect(make(404).collect(source)).rejects.toThrow('actor not found')
    await expect(make(200, { not: 'an array' }).collect(source)).rejects.toThrow('unexpected')
  })

  it('fails (rather than reporting NOT_MODIFIED) when the actor returns only noResults placeholders', async () => {
    const adapter = new ApifyAdapter(
      async () => response([{ noResults: true }, { noResults: true }]),
      'https://api.apify.com',
      't'
    )

    await expect(adapter.collect(source, { value: ORIGINAL.id })).rejects.toThrow(
      'only "noResults" placeholders'
    )
  })

  it('requires the apify config on the source', async () => {
    const withoutApify: SourceConfig = { ...source, apify: undefined }
    await expect(
      new ApifyAdapter(async () => response([]), 'https://api.apify.com', 't').collect(withoutApify)
    ).rejects.toThrow('requires adapter=APIFY')
  })
})
