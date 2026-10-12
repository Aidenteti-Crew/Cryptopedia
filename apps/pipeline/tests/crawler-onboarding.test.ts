import { describe, expect, it, vi } from 'vitest'

import type { CrawlerAnalysisClient } from '../src/crawler/analysis-client.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { activateMergedCrawler, onboardCrawl4aiSource } from '../src/jobs/crawler-onboarding.js'
import type { GitHubArtifactPublisher } from '../src/publication/github-artifact-publisher.js'
import { FakeContentDb } from './support/fake-content-db.js'

const source: SourceConfig = {
  url: 'https://build.avax.network/blog',
  chain: 'avalanche',
  sourceName: 'Avalanche Builder Hub Blog',
  sourceType: 'WEBSITE',
  adapter: 'CRAWL4AI',
  contentKind: 'BLOG',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
}

describe('crawler onboarding', () => {
  it('publishes a declarative artifact and creates a pending registry', async () => {
    const db = new FakeContentDb()
    const queries: string[] = []
    const query = async (sql: string, params: unknown[]) => {
      if (sql.includes('INSERT INTO content.crawler_registry')) {
        queries.push(sql)
        return { rows: [], rowCount: 1 }
      }
      return db.query(sql, params)
    }
    const analysisClient = {
      analyze: vi.fn(async () => ({
        analysisId: 'analysis-1',
        spec: {
          version: 1 as const,
          sourceName: source.sourceName,
          listingUrl: source.url,
          selectors: { item: 'article', title: 'h2', url: 'a' },
          pagination: 'none' as const,
          runtime: { magicMode: false },
        },
      })),
    } as unknown as CrawlerAnalysisClient
    const publisher = {
      createPullRequest: vi.fn(async () => ({
        prNumber: 7,
        prUrl: 'https://github.test/pr/7',
        branch: 'feat/crawler/avalanche-builder-hub-blog/gen-1',
        artifactPath: 'apps/pipeline/config/generated/avalanche-builder-hub-blog/gen-1.json',
        artifactHash: 'a'.repeat(64),
      })),
    } as unknown as GitHubArtifactPublisher

    const result = await onboardCrawl4aiSource(query, source, {
      analysisClient,
      publisher,
      generationId: 'gen-1',
    })
    expect(result.prNumber).toBe(7)
    expect(queries).toHaveLength(1)
  })

  it('activates only after reading the merge-commit artifact', async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 1 }))
    const publisher = {
      readMergedArtifact: vi.fn(async () => ({
        content: JSON.stringify({
          version: 1,
          sourceName: 'Builder Hub',
          listingUrl: source.url,
          selectors: { item: 'article', title: 'h2', url: 'a' },
          pagination: 'none',
          runtime: { magicMode: false },
        }),
        artifactHash: 'b'.repeat(64),
        mergedAt: '2026-09-26T00:00:00Z',
        mergeCommitSha: 'merge-sha',
      })),
    } as unknown as GitHubArtifactPublisher
    const result = await activateMergedCrawler(query, publisher, {
      registryId: 'registry-1',
      sourceId: 'source-1',
      prNumber: 7,
      artifactPath: 'apps/pipeline/config/generated/builder/gen.json',
    })
    expect(result).toEqual({ activated: true, artifactHash: 'b'.repeat(64) })
    expect(query).toHaveBeenCalledOnce()
  })
})
