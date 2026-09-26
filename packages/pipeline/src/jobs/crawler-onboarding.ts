import { v7 as uuidv7 } from 'uuid'

import { CrawlerAnalysisClient } from '../crawler/analysis-client.js'
import { serializeExtractionSpec } from '../crawler/extraction-spec.js'
import { activateMergedArtifact, createPendingRegistry } from '../db/crawler-registry-repository.js'
import type { QueryFn } from '../db/query.js'
import { getOrCreateSource } from '../db/source-repository.js'
import { GitHubArtifactPublisher } from '../publication/github-artifact-publisher.js'
import type { SourceConfig } from '../config/source-config.js'

function sourceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function onboardCrawl4aiSource(
  query: QueryFn,
  source: SourceConfig,
  deps: {
    analysisClient: CrawlerAnalysisClient
    publisher: GitHubArtifactPublisher
    generationId?: string
  }
): Promise<{ registryId: string; prNumber: number; prUrl: string }> {
  if (source.adapter !== 'CRAWL4AI') {
    throw new Error(`Crawler onboarding requires CRAWL4AI, received ${source.adapter}`)
  }
  const sourceRecord = await getOrCreateSource(query, {
    urlHandle: source.url,
    name: source.sourceName,
    type: source.sourceType,
  })
  const generationId = deps.generationId ?? uuidv7()
  const analysis = await deps.analysisClient.analyze({
    sourceId: sourceRecord.id,
    sourceName: source.sourceName,
    url: source.url,
  })
  const artifactContent = serializeExtractionSpec(analysis.spec)
  const published = await deps.publisher.createPullRequest({
    sourceSlug: sourceSlug(source.sourceName),
    generationId,
    artifactContent,
    title: `feat(crawler): add extraction spec for ${source.sourceName}`,
    body: `Source: ${source.url}\nGeneration: ${generationId}\n\nReview the declarative selectors and required CI checks before merging.`,
  })
  const registry = await createPendingRegistry(query, {
    sourceId: sourceRecord.id,
    analysisId: analysis.analysisId,
    generationId,
    artifactPath: published.artifactPath,
    artifactContent,
    prNumber: published.prNumber,
    prUrl: published.prUrl,
  })
  return { registryId: registry.id, prNumber: published.prNumber, prUrl: published.prUrl }
}

export async function activateMergedCrawler(
  query: QueryFn,
  publisher: GitHubArtifactPublisher,
  input: { registryId: string; sourceId: string; prNumber: number; artifactPath: string }
): Promise<{ activated: boolean; artifactHash?: string }> {
  const merged = await publisher.readMergedArtifact(input.prNumber, input.artifactPath)
  if (!merged) return { activated: false }
  await activateMergedArtifact(query, {
    registryId: input.registryId,
    sourceId: input.sourceId,
    artifactContent: merged.content,
    mergedAt: merged.mergedAt,
  })
  return { activated: true, artifactHash: merged.artifactHash }
}
