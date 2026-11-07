import { HtmlBoardAdapter, type BoardRejections } from '../adapters/html-board-adapter.js'
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

export interface RunHtmlBoardSourceResult {
  status: 'SUCCESS'
  sourceId: string
  inserted: number
  skippedDuplicate: number
  skippedInvalid: number
  rejected: BoardRejections
}

export interface RunHtmlBoardSourceDeps {
  adapter?: HtmlBoardAdapter
}

// Same flow as runAtomSource: the cursor advances only after the insert succeeds. Posts the
// keyword filter drops are never stored; their count and a few titles come back in the result
// so the run log shows what was left out.
export async function runHtmlBoardSource(
  query: QueryFn,
  source: SourceConfig,
  deps: RunHtmlBoardSourceDeps = {}
): Promise<RunHtmlBoardSourceResult> {
  const adapter = deps.adapter ?? new HtmlBoardAdapter()
  const sourceRecord = await getOrCreateSource(query, {
    urlHandle: source.url,
    name: source.sourceName,
    type: source.sourceType,
  })

  try {
    const cursor = (await getSourceCursor(query, sourceRecord.id)) ?? {}
    const result = await adapter.collect(source, cursor)

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
      rejected: result.rejected,
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
