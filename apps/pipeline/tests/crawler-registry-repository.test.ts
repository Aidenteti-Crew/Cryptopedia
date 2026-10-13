import { describe, expect, it, vi } from 'vitest'

import {
  activateMergedArtifact,
  createPendingRegistry,
} from '../src/db/crawler-registry-repository.js'
import type { QueryFn } from '../src/db/query.js'
import { serializeExtractionSpec } from '../src/crawler/extraction-spec.js'

const artifact = serializeExtractionSpec({
  version: 1,
  sourceName: 'Builder Hub',
  listingUrl: 'https://build.avax.network/blog',
  selectors: { item: 'article', title: 'h2', url: 'a' },
  pagination: 'none',
  runtime: { magicMode: false },
})

describe('crawler registry repository', () => {
  it('stores a pending declarative artifact and its hash', async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 1 })) as unknown as QueryFn
    await createPendingRegistry(query, {
      sourceId: 'source-1',
      generationId: '00000000-0000-7000-8000-000000000001',
      artifactPath: 'apps/pipeline/config/generated/builder/gen.json',
      artifactContent: artifact,
      prNumber: 7,
      prUrl: 'https://github.test/pr/7',
    })
    const params = (query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as unknown[]
    expect(params[3]).toBe(artifact)
    expect(params[5]).toBeInstanceOf(Buffer)
  })

  it('atomically replaces the active registry with the merge artifact', async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 1 })) as unknown as QueryFn
    await activateMergedArtifact(query, {
      registryId: 'registry-1',
      sourceId: 'source-1',
      artifactContent: artifact,
      mergedAt: '2026-09-26T00:00:00Z',
    })
    const sql = (query as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    expect(sql).toContain("SET status = 'deprecated'")
    expect(sql).toContain("SET status = 'active'")
  })
})
