import { LumaCalendarAdapter } from '../adapters/luma-calendar-adapter.js'
import type { SourceConfig } from '../config/source-config.js'
import { upsertChainEvents } from '../db/chain-event-repository.js'
import type { QueryFn } from '../db/query.js'
import {
  getOrCreateSource,
  getSourceCursor,
  recordSourceFailure,
  recordSourceSuccess,
  setSourceCursor,
} from '../db/source-repository.js'

export interface RunLumaSourceResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  sourceId: string
  inserted: number
  updated: number
  skipped: Record<string, number>
}

// Calendar events are structured already, so they go straight to content.chain_event with no
// article row and no LLM step. Same source lifecycle as the other runners.
export async function runLumaSource(
  query: QueryFn,
  source: SourceConfig,
  adapter = new LumaCalendarAdapter()
): Promise<RunLumaSourceResult> {
  const sourceRecord = await getOrCreateSource(query, {
    urlHandle: source.url,
    name: source.sourceName,
    type: source.sourceType,
  })

  try {
    const cursor = (await getSourceCursor(query, sourceRecord.id)) ?? {}
    const result = await adapter.collect(source, cursor)
    if (result.status === 'NOT_MODIFIED') {
      await recordSourceSuccess(query, sourceRecord.id)
      return {
        status: 'NOT_MODIFIED',
        sourceId: sourceRecord.id,
        inserted: 0,
        updated: 0,
        skipped: {},
      }
    }

    const { inserted, updated } = await upsertChainEvents(query, result.events)
    await setSourceCursor(query, sourceRecord.id, result.cursor)
    await recordSourceSuccess(query, sourceRecord.id)
    return {
      status: 'SUCCESS',
      sourceId: sourceRecord.id,
      inserted,
      updated,
      skipped: result.skipped,
    }
  } catch (error) {
    await recordSourceFailure(
      query,
      sourceRecord.id,
      error instanceof Error ? error.message : String(error),
      source.consecutiveFailuresThreshold
    )
    throw error
  }
}
