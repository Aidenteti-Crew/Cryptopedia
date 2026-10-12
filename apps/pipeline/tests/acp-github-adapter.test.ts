import { describe, expect, it, vi } from 'vitest'

import {
  AcpGitHubAdapter,
  classifyAcpEvent,
  parseAcpMetadata,
} from '../src/adapters/acp-github-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'

const source: SourceConfig = {
  url: 'https://github.com/avalanche-foundation/ACPs',
  sourceName: 'Avalanche Community Proposals',
  sourceType: 'CUSTOM',
  adapter: 'GITHUB_API',
  contentKind: 'GOVERNANCE',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
}

function document(status: string, suffix = ''): string {
  return `| ACP | 13 |
| :--- | :--- |
| **Title** | Subnet-Only Validators (SOVs) |
| **Author(s)** | Patrick O'Grady |
| **Status** | ${status} |
| **Track** | Standards |

## Abstract
Proposal body${suffix}`
}

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers,
  })
}

describe('ACP metadata', () => {
  it('parses the repository markdown table', () => {
    expect(parseAcpMetadata(document('Stale ([Discussion](https://example.com))'))).toEqual({
      number: 13,
      title: 'Subnet-Only Validators (SOVs)',
      authors: "Patrick O'Grady",
      status: 'Stale',
      track: 'Standards',
    })
  })

  it('classifies activation separately from other status changes', () => {
    const proposed = parseAcpMetadata(document('Proposed'))
    const activated = parseAcpMetadata(document('Activated'))
    expect(classifyAcpEvent(undefined, proposed)).toBe('ACP_CREATED')
    expect(classifyAcpEvent(proposed, activated)).toBe('ACP_ACTIVATED')
    expect(classifyAcpEvent(proposed, { ...proposed, status: 'Implementable' })).toBe(
      'ACP_STATUS_CHANGED'
    )
  })
})

describe('AcpGitHubAdapter', () => {
  it('performs an initial tree sync and emits commit-pinned events', async () => {
    const fetchFn = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/main')) {
        return response(
          { sha: 'head-1', commit: { committer: { date: '2026-09-25T00:00:00Z' } } },
          200,
          { etag: '"head-1"' }
        )
      }
      if (url.pathname.includes('/git/trees/head-1')) {
        return response({
          truncated: false,
          tree: [
            { path: 'ACPs/13-subnet-only-validators/README.md', type: 'blob' },
            { path: 'ACPs/13-subnet-only-validators/diagram.png', type: 'blob' },
          ],
        })
      }
      if (url.pathname.includes('/contents/ACPs/13-subnet-only-validators/README.md')) {
        return response(document('Proposed'))
      }
      throw new Error(`unexpected URL: ${url}`)
    })

    const result = await new AcpGitHubAdapter(fetchFn).collect(source)

    expect(result.status).toBe('SUCCESS')
    expect(result.cursor).toEqual({ value: 'head-1', etag: '"head-1"' })
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({
      title: '[ACP_CREATED] ACP-13: Subnet-Only Validators (SOVs)',
      url: expect.stringContaining('/blob/head-1/ACPs/13-subnet-only-validators/README.md'),
      canonicalUrl: expect.stringContaining('/blob/main/ACPs/13-subnet-only-validators/README.md'),
      publishedAt: '2026-09-25T00:00:00Z',
    })
  })

  it('compares the previous document and emits a status event', async () => {
    const fetchFn = vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/main')) {
        expect(new Headers(init?.headers).get('If-None-Match')).toBe('"base"')
        return response(
          { sha: 'head-2', commit: { committer: { date: '2026-09-26T00:00:00Z' } } },
          200,
          { etag: '"head-2"' }
        )
      }
      if (url.pathname.includes('/compare/base...head-2')) {
        return response({
          files: [{ filename: 'ACPs/13-subnet-only-validators/README.md', status: 'modified' }],
        })
      }
      if (url.pathname.includes('/contents/ACPs/13-subnet-only-validators/README.md')) {
        return response(
          url.searchParams.get('ref') === 'base' ? document('Proposed') : document('Activated')
        )
      }
      throw new Error(`unexpected URL: ${url}`)
    })

    const result = await new AcpGitHubAdapter(fetchFn).collect(source, {
      value: 'base',
      etag: '"base"',
    })
    expect(result.articles[0]?.title).toContain('[ACP_ACTIVATED]')
    expect(result.cursor.value).toBe('head-2')
  })

  it('returns NOT_MODIFIED for an authenticated conditional 304', async () => {
    const fetchFn = vi.fn(async (_input: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('If-None-Match')).toBe('"head-2"')
      return new Response(null, { status: 304 })
    })
    const cursor = { value: 'head-2', etag: '"head-2"' }
    await expect(new AcpGitHubAdapter(fetchFn).collect(source, cursor)).resolves.toEqual({
      status: 'NOT_MODIFIED',
      articles: [],
      cursor,
    })
  })
})
