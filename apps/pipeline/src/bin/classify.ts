import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

import { OpenAiCompatibleClient, llmConfigFromEnv } from '../classify/llm-client.js'
import { loadSourceConfig } from '../config/source-config.js'
import { createPgConnection } from '../db/pg-pool.js'
import { runClassify, type ClassifiedItem } from '../jobs/run-classify.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv()
loadEnv({ path: path.join(__dirname, '../../../../../.env') })
const CONFIG_PATH = path.join(__dirname, '../../../config/sources.yaml')

function numberArg(name: string, fallback: number): number {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  const value = Number(process.argv[index + 1])
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} needs a positive integer`)
  return value
}

function describe(item: ClassifiedItem): string {
  const date = item.article.publishedAt.toISOString().slice(0, 10)
  if (item.error) return `FAILED  ${date} ${item.article.title.slice(0, 60)} :: ${item.error}`
  const c = item.outcome?.classification
  const row = item.record ? item.record.type : (item.skippedReason ?? '-')
  return `${(c?.category ?? '?').padEnd(11)} ${c?.importance}  ${date} ${item.article.title.slice(0, 60)}  [${row}]`
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required to classify')
  const llmConfig = llmConfigFromEnv()

  const dryRun = process.argv.includes('--dry-run')
  const sources = loadSourceConfig(CONFIG_PATH)
  const sourcesByUrl = Object.fromEntries(
    sources.map((s) => [s.url, { contentKind: s.contentKind, chain: s.chain }])
  )

  const connection = createPgConnection(databaseUrl)
  try {
    const summary = await runClassify(connection.query, new OpenAiCompatibleClient(llmConfig), {
      sourcesByUrl,
      modelName: llmConfig.model,
      limit: numberArg('--limit', 20),
      concurrency: numberArg('--concurrency', 4),
      maxAttempts: 3,
      dryRun,
      onResult: (item) => console.log(`[classify] ${describe(item)}`),
    })
    console.log(
      `[classify] ${dryRun ? 'DRY RUN, nothing written. ' : ''}${JSON.stringify(summary)}`
    )
    if (summary.stoppedEarly || summary.failed > 0) process.exitCode = 1
  } finally {
    await connection.close()
  }
}

main().catch((err) => {
  console.error('[classify] fatal error:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
