import { XApiAdapter } from '../adapters/x-adapter.js'
import type { SourceConfig } from '../config/source-config.js'
import { insertArticles } from '../db/article-repository.js'
import type { QueryFn } from '../db/query.js'
import {
  getOrCreateSource,
  getSourceCursor,
  recordSourceFailure,
  recordSourceSuccess,
  setSourceCursor,
} from '../db/source-repository.js'
import { validateArticle } from '../ingestion/validate.js'

export interface RunXSourceResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  sourceId: string
  inserted: number
  skippedDuplicate: number
  skippedInvalid: number
}

export async function runXSource(
  query: QueryFn,
  source: SourceConfig,
  adapter = new XApiAdapter()
): Promise<RunXSourceResult> {
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
        status: result.status,
        sourceId: sourceRecord.id,
        inserted: 0,
        skippedDuplicate: 0,
        skippedInvalid: 0,
      }
    }

    let skippedInvalid = 0
    const validArticles = result.articles.filter((article) => {
      const errors = validateArticle(article, {
        minBodyLength: source.minBodyLength,
        excludeTitlePatterns: source.excludeTitlePatterns,
        recencyWindowDays: source.recencyWindowDays,
      })
      if (errors.length > 0) skippedInvalid++
      return errors.length === 0
    })
    const inserted = await insertArticles(query, sourceRecord.id, validArticles)
    await setSourceCursor(query, sourceRecord.id, result.cursor)
    await recordSourceSuccess(query, sourceRecord.id)
    return { status: result.status, sourceId: sourceRecord.id, ...inserted, skippedInvalid }
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
