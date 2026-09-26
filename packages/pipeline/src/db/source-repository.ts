import { v7 as uuidv7 } from 'uuid'

import type { ContentSourceType } from '../config/source-config.js'
import type { QueryFn } from './query.js'

export interface SourceRecord {
  id: string
}

export interface SourceCursorState {
  value?: string
  etag?: string
  lastModified?: string
}

interface CreateSourceInput {
  urlHandle: string
  name: string
  type: ContentSourceType
}

// content.source has a partial unique index on url_handle_hash (WHERE revoked_at IS NULL),
// so lookup-and-create is done as a single atomic upsert rather than SELECT-then-INSERT.
// A pre-check SELECT is a race condition under concurrent runs; ON CONFLICT is not.
export async function getOrCreateSource(
  query: QueryFn,
  input: CreateSourceInput
): Promise<SourceRecord> {
  const candidateId = uuidv7()
  const inserted = await query(
    `INSERT INTO content.source (id, type, name, url_handle, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (url_handle_hash) WHERE (revoked_at IS NULL) DO NOTHING
     RETURNING id`,
    [candidateId, input.type, input.name, input.urlHandle]
  )
  const insertedRow = inserted.rows[0] as { id: string } | undefined
  if (insertedRow) return { id: insertedRow.id }

  const existing = await query(
    `SELECT id FROM content.source
     WHERE url_handle_hash = decode(md5($1), 'hex') AND revoked_at IS NULL
     LIMIT 1`,
    [input.urlHandle]
  )
  const existingRow = existing.rows[0] as { id: string } | undefined
  if (!existingRow) {
    throw new Error(
      `getOrCreateSource: insert was skipped by ON CONFLICT but no existing row was found for url_handle="${input.urlHandle}"`
    )
  }
  return { id: existingRow.id }
}

// Adapter cursor/health state is stored in content.source.source_meta_json (already a JSONB
// column with a GIN index) instead of a new table, per architecture.md §4.2 — avoids a
// migration for Phase 1's scope.
export async function getSourceCursor(
  query: QueryFn,
  sourceId: string
): Promise<SourceCursorState | undefined> {
  const result = await query(
    `SELECT source_meta_json -> 'cursor' AS cursor FROM content.source WHERE id = $1`,
    [sourceId]
  )
  const row = result.rows[0] as { cursor: SourceCursorState | null } | undefined
  return row?.cursor ?? undefined
}

export async function setSourceCursor(
  query: QueryFn,
  sourceId: string,
  cursor: SourceCursorState
): Promise<void> {
  await query(
    `UPDATE content.source
     SET source_meta_json = jsonb_set(coalesce(source_meta_json, '{}'::jsonb), '{cursor}', $2::jsonb, true)
     WHERE id = $1`,
    [sourceId, JSON.stringify(cursor)]
  )
}

export async function recordSourceSuccess(query: QueryFn, sourceId: string): Promise<void> {
  await query(
    `UPDATE content.source
     SET last_fetched_at = now(),
         last_success_at = now(),
         consecutive_failures = 0,
         total_fetches = total_fetches + 1,
         is_healthy = true
     WHERE id = $1`,
    [sourceId]
  )
}

export async function recordSourceFailure(
  query: QueryFn,
  sourceId: string,
  errorMessage: string,
  unhealthyThreshold: number
): Promise<{ consecutiveFailures: number }> {
  const result = await query(
    `UPDATE content.source
     SET last_fetched_at = now(),
         last_error_at = now(),
         last_error_msg = $2,
         consecutive_failures = consecutive_failures + 1,
         total_fetches = total_fetches + 1,
         total_failures = total_failures + 1,
         is_healthy = (consecutive_failures + 1) < $3
     WHERE id = $1
     RETURNING consecutive_failures`,
    [sourceId, errorMessage.slice(0, 2000), unhealthyThreshold]
  )
  const row = result.rows[0] as { consecutive_failures: number } | undefined
  return { consecutiveFailures: Number(row?.consecutive_failures ?? 0) }
}
