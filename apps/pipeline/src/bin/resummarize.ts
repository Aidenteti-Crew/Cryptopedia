import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

import { classifyArticle } from '../classify/classify-article.js'
import { OpenAiCompatibleClient, llmConfigFromEnv } from '../classify/llm-client.js'
import { loadSourceConfig } from '../config/source-config.js'
import { createPgConnection } from '../db/pg-pool.js'

// classify only handles articles with no classification yet, so a prompt change never reaches the
// rows already shown. This re-asks the model for the title and summary of existing macro_news rows
// and updates only those two columns; the previous values go to --backup first so a run can be undone.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv()
loadEnv({ path: path.join(__dirname, '../../../../../.env') })
const CONFIG_PATH = path.join(__dirname, '../../../config/sources.yaml')

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

interface Row {
  id: string
  old_title: string
  old_summary: string | null
  title: string
  url: string
  author: string | null
  body: string | null
  published_at: Date
  source_name: string
  source_url: string
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')
  const dryRun = process.argv.includes('--dry-run')
  const backup = arg('--backup')
  if (!dryRun && !backup) throw new Error('--backup <file.json> is required unless --dry-run')
  const limit = Number(arg('--limit') ?? 1000)

  const kinds = Object.fromEntries(loadSourceConfig(CONFIG_PATH).map((s) => [s.url, s.contentKind]))
  const llmConfig = llmConfigFromEnv()
  const llm = new OpenAiCompatibleClient(llmConfig)
  const connection = createPgConnection(databaseUrl)
  try {
    const { rows } = await connection.query(
      `SELECT m.id, m.title AS old_title, m.summary AS old_summary,
              a.title, a.url, a.author, a.content_raw AS body, a.published_at,
              s.name AS source_name, s.url_handle AS source_url
         FROM content.macro_news m
         JOIN content.article_raw a ON a.id = m.article_raw_id
         JOIN content.source s ON s.id = a.source_id
        WHERE m.revoked_at IS NULL
        ORDER BY a.published_at DESC
        LIMIT $1`,
      [limit]
    )
    type Result = { id: string; before: { title: string; summary: string | null }; after?: { title: string; summary: string }; skipped?: string }
    const results: Result[] = []
    const report = (r: Result) => {
      results.push(r)
      console.log(`[resummarize] ${r.skipped ? `SKIP (${r.skipped})` : 'OK  '} ${r.before.title.slice(0, 50)}${r.after ? `  ->  ${r.after.title}` : ''}`)
    }
    for (const row of rows as unknown as Row[]) {
      try {
        const { classification: c } = await classifyArticle(llm, {
          title: row.title,
          url: row.url,
          author: row.author,
          body: row.body,
          publishedAt: new Date(row.published_at),
          sourceName: row.source_name,
          contentKind: kinds[row.source_url] ?? 'UNKNOWN',
        })
        const before = { title: row.old_title, summary: row.old_summary }
        if (c.category !== 'MACRO') {
          report({ id: row.id, before, skipped: `model now says ${c.category}` })
        } else {
          report({ id: row.id, before, after: { title: (c.title_ko ?? row.title).slice(0, 500), summary: c.summary_ko } })
        }
      } catch (error) {
        report({ id: row.id, before: { title: row.old_title, summary: row.old_summary }, skipped: error instanceof Error ? error.message : String(error) })
      }
    }

    const updates = results.filter((r) => r.after)
    if (dryRun) {
      console.log(JSON.stringify(results, null, 2))
      console.log(`[resummarize] DRY RUN, nothing written. ${updates.length} of ${results.length} would change.`)
      return
    }
    writeFileSync(backup!, JSON.stringify(results.map(({ id, before }) => ({ id, ...before })), null, 2))
    for (const r of updates) {
      await connection.query(
        `UPDATE content.macro_news SET title = $2, summary = $3, updated_at = now() WHERE id = $1`,
        [r.id, r.after!.title, r.after!.summary]
      )
    }
    console.log(`[resummarize] updated ${updates.length} of ${results.length}; previous values in ${backup}`)
  } finally {
    await connection.close()
  }
}

main().catch((err) => {
  console.error('[resummarize] fatal error:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
