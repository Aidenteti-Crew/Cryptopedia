import { v7 as uuidv7 } from 'uuid'

import { artifactSha256, serializeExtractionSpec } from '../crawler/extraction-spec.js'
import type { QueryFn } from './query.js'

export interface PendingRegistryInput {
  sourceId: string
  analysisId?: string
  generationId: string
  artifactPath: string
  artifactContent: string
  prNumber: number
  prUrl: string
}

export async function createPendingRegistry(
  query: QueryFn,
  input: PendingRegistryInput
): Promise<{ id: string }> {
  const id = uuidv7()
  const canonicalContent = serializeExtractionSpec(JSON.parse(input.artifactContent))
  await query(
    `INSERT INTO content.crawler_registry (
       id, source_id, analysis_id, status, generated_code, artifact_path,
       artifact_hash, generation_id, pr_number, pr_url
     ) VALUES ($1, $2, $3, 'pending_review', $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.sourceId,
      input.analysisId ?? null,
      canonicalContent,
      input.artifactPath,
      artifactSha256(canonicalContent),
      input.generationId,
      input.prNumber,
      input.prUrl,
    ]
  )
  return { id }
}

export async function activateMergedArtifact(
  query: QueryFn,
  input: {
    registryId: string
    sourceId: string
    artifactContent: string
    mergedAt: string
  }
): Promise<void> {
  // Validate and canonicalize the exact merge-commit artifact before it can become active.
  // The CTE deprecates the previous active row and activates the reviewed row atomically.
  const canonicalContent = serializeExtractionSpec(JSON.parse(input.artifactContent))
  const result = await query(
    `WITH deprecated AS (
       UPDATE content.crawler_registry
       SET status = 'deprecated'
       WHERE source_id = $2 AND status = 'active' AND id <> $1
     )
     UPDATE content.crawler_registry
     SET status = 'active',
         generated_code = $3,
         artifact_hash = $4,
         pr_merged_at = $5,
         consecutive_failures = 0
     WHERE id = $1 AND source_id = $2 AND status = 'pending_review'`,
    [
      input.registryId,
      input.sourceId,
      canonicalContent,
      artifactSha256(canonicalContent),
      input.mergedAt,
    ]
  )
  if (result.rowCount !== 1) {
    throw new Error(`Pending crawler registry not found: ${input.registryId}`)
  }
}
