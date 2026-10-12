import { LlmFatalError, type LlmClient } from '../classify/llm-client.js'
import { scoreBatch, type ScoreKind } from '../classify/score-items.js'
import type { QueryFn } from '../db/query.js'
import { fetchUnscored, saveScore } from '../db/score-repository.js'

export interface ScoreOptions {
  kind: ScoreKind
  chain: string
  modelName: string
  limit: number
  batchSize: number
  concurrency: number
}

export interface ScoreSummary {
  pending: number
  scored: number
  unscored: number
  failedBatches: number
  distribution: Record<string, number>
  stoppedEarly?: string
}

// Scores up to `limit` unscored rows in batches; batches run concurrently. A failed batch leaves
// its rows unscored so the next run retries them.
export async function runScore(
  query: QueryFn,
  llm: LlmClient,
  options: ScoreOptions
): Promise<ScoreSummary> {
  const items = await fetchUnscored(query, options.kind, options.chain, options.limit)
  const batches: (typeof items)[] = []
  for (let i = 0; i < items.length; i += options.batchSize) {
    batches.push(items.slice(i, i + options.batchSize))
  }
  const summary: ScoreSummary = {
    pending: items.length,
    scored: 0,
    unscored: 0,
    failedBatches: 0,
    distribution: {},
  }

  let next = 0
  let fatal: Error | undefined
  const worker = async (): Promise<void> => {
    while (!fatal) {
      const batch = batches[next++]
      if (!batch) return
      try {
        const scores = await scoreBatch(llm, options.kind, batch)
        for (const item of batch) {
          const score = scores.get(item.id)
          if (!score) {
            summary.unscored++
            continue
          }
          await saveScore(query, options.kind, item.id, score, options.modelName)
          summary.scored++
          summary.distribution[score.importance] = (summary.distribution[score.importance] ?? 0) + 1
        }
      } catch (error) {
        if (error instanceof LlmFatalError) {
          fatal = error
          return
        }
        summary.failedBatches++
        summary.unscored += batch.length
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(options.concurrency, batches.length)) }, worker)
  )
  if (fatal) summary.stoppedEarly = fatal.message
  return summary
}
