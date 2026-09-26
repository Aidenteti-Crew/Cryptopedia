import { describe, expect, it, vi } from 'vitest'

import { serializeExtractionSpec } from '../src/crawler/extraction-spec.js'
import { GitHubArtifactPublisher } from '../src/publication/github-artifact-publisher.js'

const artifact = serializeExtractionSpec({
  version: 1,
  sourceName: 'Builder Hub',
  listingUrl: 'https://build.avax.network/blog',
  selectors: { item: 'article', title: 'h2', url: 'a' },
  pagination: 'none',
  runtime: { magicMode: false },
})

function publisher(
  fetchFn: (input: string, init?: RequestInit) => Promise<Response>
): GitHubArtifactPublisher {
  return new GitHubArtifactPublisher(
    { token: 'token', owner: 'owner', repo: 'repo', baseBranch: 'hansu-crawl' },
    fetchFn
  )
}

describe('GitHubArtifactPublisher', () => {
  it('creates an immutable generation branch without touching prior PRs', async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = []
    const fetchFn = vi.fn(async (input: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url: input, method: init?.method ?? 'GET', body })
      if (input.includes('/branches/'))
        return new Response(JSON.stringify({ commit: { sha: 'base' } }))
      if (input.endsWith('/git/refs')) return new Response('{}', { status: 201 })
      if (input.includes('/contents/')) return new Response('{}', { status: 201 })
      if (input.endsWith('/pulls')) {
        return new Response(JSON.stringify({ number: 7, html_url: 'https://github.test/pr/7' }), {
          status: 201,
        })
      }
      throw new Error(`unexpected request: ${input}`)
    })
    const result = await publisher(fetchFn).createPullRequest({
      sourceSlug: 'builder-hub',
      generationId: 'gen-123',
      artifactContent: artifact,
      title: 'Add crawler',
      body: 'Review extraction spec',
    })
    expect(result.branch).toBe('feat/crawler/builder-hub/gen-123')
    expect(result.artifactPath).toBe('packages/pipeline/config/generated/builder-hub/gen-123.json')
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    expect(calls.some((call) => call.url.includes('/pulls?'))).toBe(false)
  })

  it('reads and hashes the final artifact from the merge commit', async () => {
    const fetchFn = vi.fn(async (input: string) => {
      if (input.endsWith('/pulls/7')) {
        return new Response(
          JSON.stringify({ merged_at: '2026-09-26T00:00:00Z', merge_commit_sha: 'merged-sha' })
        )
      }
      expect(input).toContain('ref=merged-sha')
      return new Response(artifact)
    })
    const merged = await publisher(fetchFn).readMergedArtifact(
      7,
      'packages/pipeline/config/generated/builder-hub/gen-123.json'
    )
    expect(merged?.content).toBe(artifact)
    expect(merged?.artifactHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects reads outside the generated artifact allowlist', async () => {
    await expect(
      publisher(vi.fn()).readMergedArtifact(7, '.github/workflows/deploy.yml')
    ).rejects.toThrow('outside the generated-spec allowlist')
  })
})
