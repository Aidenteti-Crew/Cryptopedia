import { describe, expect, it, vi } from 'vitest'

import { AtomAdapter } from '../src/adapters/atom-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'

const source: SourceConfig = {
  url: 'https://github.com/ava-labs/avalanchego/releases.atom',
  sourceName: 'AvalancheGo Releases',
  sourceType: 'RSS',
  adapter: 'ATOM',
  contentKind: 'RELEASE',
  authority: 'OFFICIAL',
  enabled: true,
  recencyWindowDays: 7,
  consecutiveFailuresThreshold: 3,
}

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>tag:github.com,2008:Repository/123/v1.2.3</id>
    <updated>2026-09-25T01:02:03Z</updated>
    <title>v1.2.3</title>
    <content type="html">Release notes</content>
    <author><name>ava-labs</name></author>
    <link rel="alternate" href="https://github.com/ava-labs/avalanchego/releases/tag/v1.2.3" />
  </entry>
</feed>`

describe('AtomAdapter', () => {
  it('parses entries and advances HTTP cursor metadata', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(feed, {
          headers: { etag: '"feed-v1"', 'last-modified': 'Fri, 25 Sep 2026 01:02:03 GMT' },
        })
    )
    const result = await new AtomAdapter(fetchFn).collect(source)

    expect(result.status).toBe('SUCCESS')
    expect(result.articles[0]).toMatchObject({
      guid: 'tag:github.com,2008:Repository/123/v1.2.3',
      title: 'v1.2.3',
      body: 'Release notes',
      author: 'ava-labs',
    })
    expect(result.cursor.etag).toBe('"feed-v1"')
  })

  it('uses conditional headers and treats 304 as a successful no-op', async () => {
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('If-None-Match')).toBe('"feed-v1"')
      return new Response(null, { status: 304 })
    })

    const cursor = { value: 'release-1', etag: '"feed-v1"' }
    const result = await new AtomAdapter(fetchFn).collect(source, cursor)
    expect(result).toEqual({ status: 'NOT_MODIFIED', articles: [], cursor })
  })
})
