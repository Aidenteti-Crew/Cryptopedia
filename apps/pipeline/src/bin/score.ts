import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

import { OpenAiCompatibleClient, llmConfigFromEnv } from '../classify/llm-client.js'
import type { ScoreKind } from '../classify/score-items.js'
import { createPgConnection } from '../db/pg-pool.js'
import { runScore } from '../jobs/run-score.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv()
loadEnv({ path: path.join(__dirname, '../../../../../.env') })

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function numberArg(name: string, fallback: number): number {
  const raw = arg(name)
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} needs a positive integer`)
  return value
}

// Usage: pnpm score [--kind projects|events|all] [--chain avalanche] [--limit 300]
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required to score')
  const llmConfig = llmConfigFromEnv()
  const kindArg = arg('--kind') ?? 'all'
  if (!['all', 'projects', 'events'].includes(kindArg)) {
    throw new Error('--kind must be projects, events or all')
  }
  const kinds: ScoreKind[] =
    kindArg === 'all' ? ['EVENT', 'PROJECT'] : kindArg === 'projects' ? ['PROJECT'] : ['EVENT']

  const connection = createPgConnection(databaseUrl)
  try {
    const llm = new OpenAiCompatibleClient(llmConfig)
    for (const kind of kinds) {
      const summary = await runScore(connection.query, llm, {
        kind,
        chain: arg('--chain') ?? 'avalanche',
        modelName: llmConfig.model,
        limit: numberArg('--limit', 300),
        batchSize: numberArg('--batch', 10),
        concurrency: numberArg('--concurrency', 4),
      })
      console.log(`[score] ${kind}: ${JSON.stringify(summary)}`)
      if (summary.stoppedEarly || summary.failedBatches > 0) process.exitCode = 1
      if (summary.stoppedEarly) break
    }
  } finally {
    await connection.close()
  }
}

main().catch((err) => {
  console.error('[score] fatal error:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
