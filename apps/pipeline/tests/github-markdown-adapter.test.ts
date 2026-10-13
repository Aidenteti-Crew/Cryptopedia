import { describe, expect, it, vi } from 'vitest'

import {
  GithubMarkdownAdapter,
  parseMarkdownPost,
} from '../src/adapters/github-markdown-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'

const source: SourceConfig = {
  url: 'https://build.avax.network/blog',
  chain: 'avalanche',
  sourceName: 'Avalanche Builder Hub Blog',
  sourceType: 'WEBSITE',
  adapter: 'GITHUB_MARKDOWN',
  contentKind: 'BLOG',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  github: { owner: 'ava-labs', repo: 'builders-hub', branch: 'master', path: 'content/blog' },
}

const POST = `---
title: "Helicon: Improved Staking Economics"
description: The Helicon upgrade activates six ACPs.
date: 2026-09-08
authors: [AvaxDevelopers, Someone Else]
topics: [Network Updates]
---

import { Diagram } from "@/components/diagram";

## Introducing the Helicon Upgrade

Body text.
`

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })
}

describe('parseMarkdownPost', () => {
  it('parses frontmatter, joins authors, and drops MDX import lines', () => {
    const post = parseMarkdownPost(POST)
    expect(post).toMatchObject({
      title: 'Helicon: Improved Staking Economics',
      publishedAt: '2026-09-08T00:00:00.000Z',
      authors: 'AvaxDevelopers, Someone Else',
    })
    expect(post.body).toContain('The Helicon upgrade activates six ACPs.')
    expect(post.body).toContain('## Introducing the Helicon Upgrade')
    expect(post.body).not.toContain('import {')
  })

  it('rejects posts without a title or a valid date', () => {
    expect(() => parseMarkdownPost('no frontmatter')).toThrow('missing YAML frontmatter')
    expect(() => parseMarkdownPost('---\ndate: 2026-01-01\n---\nbody')).toThrow('missing title')
    expect(() => parseMarkdownPost('---\ntitle: x\ndate: not-a-date\n---\nbody')).toThrow(
      'valid date'
    )
  })
})

describe('GithubMarkdownAdapter', () => {
  it('syncs every post on the first run and uses stable public URLs', async () => {
    const fetchFn = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/master')) {
        return response({ sha: 'head-1' }, 200, { etag: '"head-1"' })
      }
      if (url.pathname.includes('/git/trees/head-1')) {
        return response({
          truncated: false,
          tree: [
            { path: 'content/blog/helicon-upgrade.mdx', type: 'blob' },
            { path: 'content/blog/images/diagram.png', type: 'blob' },
            { path: 'content/docs/other.mdx', type: 'blob' },
          ],
        })
      }
      if (url.pathname.includes('/contents/content/blog/helicon-upgrade.mdx')) return response(POST)
      throw new Error(`unexpected URL: ${url}`)
    })

    const result = await new GithubMarkdownAdapter(fetchFn).collect(source)

    expect(result.status).toBe('SUCCESS')
    expect(result.cursor).toEqual({ value: 'head-1', etag: '"head-1"' })
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({
      url: 'https://build.avax.network/blog/helicon-upgrade',
      title: 'Helicon: Improved Staking Economics',
      author: 'AvaxDevelopers, Someone Else',
      publishedAt: '2026-09-08T00:00:00.000Z',
    })
  })

  it('fetches only newly added posts after the cursor', async () => {
    const fetchFn = vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/master')) {
        expect(new Headers(init?.headers).get('If-None-Match')).toBe('"base"')
        return response({ sha: 'head-2' }, 200, { etag: '"head-2"' })
      }
      if (url.pathname.includes('/compare/base...head-2')) {
        return response({
          files: [
            { filename: 'content/blog/new-post.mdx', status: 'added' },
            { filename: 'content/blog/old-post.mdx', status: 'modified' },
            { filename: 'content/blog/gone.mdx', status: 'removed' },
          ],
        })
      }
      if (url.pathname.includes('/contents/content/blog/new-post.mdx')) return response(POST)
      throw new Error(`unexpected URL: ${url}`)
    })

    const result = await new GithubMarkdownAdapter(fetchFn).collect(source, {
      value: 'base',
      etag: '"base"',
    })

    expect(result.articles.map((a) => a.url)).toEqual(['https://build.avax.network/blog/new-post'])
    expect(result.cursor.value).toBe('head-2')
  })

  it('skips a malformed post but still returns the valid ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetchFn = vi.fn(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/master')) return response({ sha: 'head-1' })
      if (url.pathname.includes('/git/trees/')) {
        return response({
          tree: [
            { path: 'content/blog/bad.mdx', type: 'blob' },
            { path: 'content/blog/good.mdx', type: 'blob' },
          ],
        })
      }
      if (url.pathname.includes('/bad.mdx')) return response('no frontmatter here')
      return response(POST)
    })

    const result = await new GithubMarkdownAdapter(fetchFn).collect(source)
    warn.mockRestore()

    expect(result.articles.map((a) => a.url)).toEqual(['https://build.avax.network/blog/good'])
  })

  it('returns NOT_MODIFIED on a 304 or an unchanged head sha', async () => {
    const cursor = { value: 'head-1', etag: '"head-1"' }
    const notModified = new GithubMarkdownAdapter(async () => new Response(null, { status: 304 }))
    await expect(notModified.collect(source, cursor)).resolves.toEqual({
      status: 'NOT_MODIFIED',
      articles: [],
      cursor,
    })
    const sameSha = new GithubMarkdownAdapter(async () => response({ sha: 'head-1' }))
    expect((await sameSha.collect(source, cursor)).status).toBe('NOT_MODIFIED')
  })

  it('requires the github location in the source config', async () => {
    const withoutGithub: SourceConfig = { ...source, github: undefined }
    await expect(
      new GithubMarkdownAdapter(async () => response({})).collect(withoutGithub)
    ).rejects.toThrow('requires adapter=GITHUB_MARKDOWN with github config')
  })
})
