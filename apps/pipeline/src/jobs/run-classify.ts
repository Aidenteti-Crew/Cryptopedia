import { buildCategoryRecord, type CategoryRecord } from '../classify/category-records.js'
import { classifyArticle, type ClassificationOutcome } from '../classify/classify-article.js'
import { LlmFatalError, type LlmClient } from '../classify/llm-client.js'
import {
  fetchPendingArticles,
  insertCategoryRecord,
  isKnownTimezone,
  saveClassificationFailure,
  saveClassificationSuccess,
  type PendingArticle,
} from '../db/classification-repository.js'
import type { QueryFn } from '../db/query.js'

export interface ClassifyOptions {
  // url_handle of every configured source, mapped to its content kind (RELEASE, BLOG, ...) and
  // the chain whose ecosystem it belongs to.
  sourcesByUrl: Record<string, { contentKind: string; chain: string }>
  modelName: string
  limit: number
  concurrency: number
  maxAttempts: number
  // Classify and report, but write nothing: used to review model output before trusting it.
  dryRun: boolean
  onResult?: (item: ClassifiedItem) => void
}

export interface ClassifiedItem {
  article: PendingArticle
  outcome?: ClassificationOutcome
  record?: CategoryRecord | null
  skippedReason?: string
  error?: string
}

export interface ClassifySummary {
  processed: number
  succeeded: number
  failed: number
  byCategory: Record<string, number>
  inserted: Record<string, number>
  duplicates: number
  skipped: Record<string, number>
  stoppedEarly?: string
}

function bump(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1
}

export async function runClassify(
  query: QueryFn,
  llm: LlmClient,
  options: ClassifyOptions
): Promise<ClassifySummary> {
  const sourceUrls = Object.keys(options.sourcesByUrl)
  const pending = await fetchPendingArticles(query, {
    sourceUrls,
    limit: options.limit,
    maxAttempts: options.maxAttempts,
  })

  const summary: ClassifySummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    byCategory: {},
    inserted: {},
    duplicates: 0,
    skipped: {},
  }

  let next = 0
  let fatal: Error | undefined

  const worker = async (): Promise<void> => {
    while (!fatal) {
      const article = pending[next++]
      if (!article) return
      const item: ClassifiedItem = { article }
      // Pending articles are selected by these same URLs, so every one has an entry.
      const sourceInfo = options.sourcesByUrl[article.sourceUrl] ?? {
        contentKind: 'UNKNOWN',
        chain: 'unknown',
      }
      try {
        const outcome = await classifyArticle(llm, {
          title: article.title,
          url: article.url,
          author: article.author,
          body: article.body,
          publishedAt: article.publishedAt,
          sourceName: article.sourceName,
          contentKind: sourceInfo.contentKind,
        })
        item.outcome = outcome
        const built = buildCategoryRecord(
          {
            id: article.id,
            title: article.title,
            publishedAt: article.publishedAt,
            contentKind: sourceInfo.contentKind,
            chain: sourceInfo.chain,
          },
          outcome.classification,
          article.url
        )
        let record = built.record
        let skippedReason = built.skippedReason
        if (record?.type === 'EVENT' && !(await isKnownTimezone(query, record.timezone))) {
          record = null
          skippedReason = 'event timezone unknown to Postgres'
        }
        item.record = record
        item.skippedReason = skippedReason

        if (!options.dryRun) {
          // Category row first: if the process dies before the classification row is written,
          // the next run re-classifies and the conflict clause makes the insert a no-op.
          if (record) {
            const created = await insertCategoryRecord(query, article.id, record)
            if (created) bump(summary.inserted, record.type)
            else summary.duplicates++
          }
          await saveClassificationSuccess(query, article.id, outcome, options.modelName)
        } else if (record) {
          bump(summary.inserted, record.type)
        }
        if (skippedReason) bump(summary.skipped, skippedReason)
        summary.succeeded++
        bump(summary.byCategory, outcome.classification.category)
      } catch (error) {
        if (error instanceof LlmFatalError) {
          fatal = error
          return
        }
        const message = error instanceof Error ? error.message : String(error)
        item.error = message
        summary.failed++
        if (!options.dryRun) {
          await saveClassificationFailure(query, article.id, message, options.modelName)
        }
      }
      summary.processed++
      options.onResult?.(item)
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(options.concurrency, pending.length)) }, worker)
  )
  if (fatal) summary.stoppedEarly = fatal.message
  return summary
}
