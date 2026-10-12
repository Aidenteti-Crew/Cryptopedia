import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

import { loadSourceConfig } from '../config/source-config.js'
import { createPgConnection } from '../db/pg-pool.js'
import { runPipeline } from '../jobs/run-pipeline.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// The shared .env lives at the repo root (next to .env.example); a package-local .env still wins.
loadEnv()
loadEnv({ path: path.join(__dirname, '../../../../../.env') })
const CONFIG_PATH = path.join(__dirname, '../../../config/sources.yaml')

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the pipeline')
  }

  const sources = loadSourceConfig(CONFIG_PATH)
  const connection = createPgConnection(databaseUrl)
  try {
    const summaries = await runPipeline(connection.query, sources)
    for (const summary of summaries) {
      const suffix = summary.error ? ` — ${summary.error}` : ''
      console.log(
        `[pipeline] ${summary.sourceName} (${summary.adapter}): ${summary.status}${suffix}`
      )
    }
    if (summaries.some((summary) => summary.status === 'FAILED')) {
      process.exitCode = 1
    }
  } finally {
    await connection.close()
  }
}

main().catch((err) => {
  console.error('[pipeline] fatal error:', err)
  process.exitCode = 1
})
