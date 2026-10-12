import { describe, expect, it, vi } from 'vitest'

import {
  GithubProjectDirectoryAdapter,
  parseProjectEntry,
} from '../src/adapters/github-project-directory-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'

const source: SourceConfig = {
  url: 'https://build.avax.network/integrations',
  sourceName: 'Avalanche Builder Hub Integrations',
  sourceType: 'WEBSITE',
  adapter: 'GITHUB_DIRECTORY',
  contentKind: 'PROJECT',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  github: {
    owner: 'ava-labs',
    repo: 'builders-hub',
    branch: 'master',
    path: 'content/integrations',
  },
}

// Frontmatter copied from the real content/integrations/0xgasless.mdx.
const ENTRY = `---
title: 0xGasless
category: x402
available: ["C-Chain"]
description: 0xGasless offers x402 facilitator for the AVALANCHE Chain
logo: /images/0xGasless.png
developer: 0xGasless
website: https://0xgasless.com/
documentation: https://docs.0xgasless.com/
---

## Overview
`

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })
}

describe('parseProjectEntry', () => {
  it('maps frontmatter to a project record', () => {
    expect(
      parseProjectEntry(ENTRY, '0xgasless', 'https://build.avax.network/integrations/0xgasless')
    ).toEqual({
      externalKey: '0xgasless',
      name: '0xGasless',
      category: 'x402',
      developer: '0xGasless',
      websiteUrl: 'https://0xgasless.com/',
      documentationUrl: 'https://docs.0xgasless.com/',
      description: '0xGasless offers x402 facilitator for the AVALANCHE Chain',
      chains: ['C-Chain'],
      sourceUrl: 'https://build.avax.network/integrations/0xgasless',
    })
  })

  it('tolerates missing optional fields but requires a title', () => {
    const minimal = parseProjectEntry('---\ntitle: Aave\n---\nbody', 'aave', 'u')
    expect(minimal).toMatchObject({ name: 'Aave', category: null, chains: [], websiteUrl: null })
    expect(() => parseProjectEntry('---\ncategory: DeFi\n---\nbody', 'x', 'u')).toThrow('title')
  })
})

describe('GithubProjectDirectoryAdapter', () => {
  it('reads every .mdx entry on the first run and ignores README and subfolders', async () => {
    const fetchFn = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/master')) {
        return response({ sha: 'head-1' }, 200, { etag: '"h1"' })
      }
      if (url.pathname.includes('/git/trees/head-1')) {
        return response({
          tree: [
            { path: 'content/integrations/0xgasless.mdx', type: 'blob' },
            { path: 'content/integrations/README.md', type: 'blob' },
            { path: 'content/integrations/images/a.mdx', type: 'blob' },
            { path: 'content/blog/other.mdx', type: 'blob' },
          ],
        })
      }
      if (url.pathname.endsWith('/0xgasless.mdx')) return response(ENTRY)
      throw new Error(`unexpected URL: ${url}`)
    })

    const result = await new GithubProjectDirectoryAdapter(fetchFn).collect(source)

    expect(result.status).toBe('SUCCESS')
    expect(result.projects.map((p) => p.externalKey)).toEqual(['0xgasless'])
    expect(result.projects[0]?.sourceUrl).toBe('https://build.avax.network/integrations/0xgasless')
    expect(result.cursor).toEqual({ value: 'head-1', etag: '"h1"' })
  })

  it('upserts added/modified entries and reports removed and renamed-away keys', async () => {
    const fetchFn = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/master')) return response({ sha: 'head-2' })
      if (url.pathname.includes('/compare/base...head-2')) {
        return response({
          files: [
            { filename: 'content/integrations/new.mdx', status: 'added' },
            { filename: 'content/integrations/edited.mdx', status: 'modified' },
            { filename: 'content/integrations/gone.mdx', status: 'removed' },
            {
              filename: 'content/integrations/renamed-to.mdx',
              status: 'renamed',
              previous_filename: 'content/integrations/renamed-from.mdx',
            },
            { filename: 'content/blog/ignored.mdx', status: 'added' },
          ],
        })
      }
      return response(ENTRY)
    })

    const result = await new GithubProjectDirectoryAdapter(fetchFn).collect(source, {
      value: 'base',
    })

    expect(result.projects.map((p) => p.externalKey).sort()).toEqual([
      'edited',
      'new',
      'renamed-to',
    ])
    expect(result.removedKeys.sort()).toEqual(['gone', 'renamed-from'])
  })

  it('skips an entry without a title and returns NOT_MODIFIED when nothing changed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetchFn = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/master')) return response({ sha: 'head-1' })
      if (url.pathname.includes('/git/trees/')) {
        return response({ tree: [{ path: 'content/integrations/bad.mdx', type: 'blob' }] })
      }
      return response('---\ncategory: DeFi\n---\nbody')
    })
    const adapter = new GithubProjectDirectoryAdapter(fetchFn)

    expect((await adapter.collect(source)).projects).toEqual([])
    warn.mockRestore()

    const unchanged = await adapter.collect(source, { value: 'head-1' })
    expect(unchanged.status).toBe('NOT_MODIFIED')
  })
})
