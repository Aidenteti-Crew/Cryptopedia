import { AtomAdapter } from '../adapters/atom-adapter.js'
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

export interface RunAtomSourceResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  sourceId: string
  inserted: number
  skippedDuplicate: number
  skippedInvalid: number
}

export interface RunAtomSourceDeps {
  adapter?: AtomAdapter
}

// Cursor only advances on the success path below, after insertArticles resolves. If the
// fetch, validation, or insert throws, recordSourceFailure runs and the stored cursor is
// left untouched — matching architecture.md §8 ("DB 저장 실패 → cursor를 전진시키지 않고").
export async function runAtomSource(
  query: QueryFn,
  source: SourceConfig,
  deps: RunAtomSourceDeps = {}
): Promise<RunAtomSourceResult> {
  const adapter = deps.adapter ?? new AtomAdapter()
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
        skippedDuplicate: 0,
        skippedInvalid: 0,
      }
    }

    let skippedInvalid = 0
    const validArticles = result.articles.filter((article) => {
      const errors = validateArticle(article, {
        minBodyLength: source.minBodyLength,
        recencyWindowDays: source.recencyWindowDays,
      })
      if (errors.length > 0) skippedInvalid++
      return errors.length === 0
    })

    const { inserted, skippedDuplicate } = await insertArticles(
      query,
      sourceRecord.id,
      validArticles
    )
    await setSourceCursor(query, sourceRecord.id, result.cursor)
    await recordSourceSuccess(query, sourceRecord.id)

    return {
      status: 'SUCCESS',
      sourceId: sourceRecord.id,
      inserted,
      skippedDuplicate,
      skippedInvalid,
    }
  } catch (err) {
    await recordSourceFailure(
      query,
      sourceRecord.id,
      err instanceof Error ? err.message : String(err),
      source.consecutiveFailuresThreshold
    )
    throw err
  }
}
