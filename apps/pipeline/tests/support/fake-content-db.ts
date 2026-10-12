import { createHash } from 'node:crypto'

import { v7 as uuidv7 } from 'uuid'

import type { QueryFn, QueryResult } from '../../src/db/query.js'

function md5Hex(value: string): string {
  return createHash('md5').update(value).digest('hex')
}

interface SourceRow {
  id: string
  type: string
  name: string
  url_handle: string
  revoked_at: string | null
  source_meta_json: Record<string, unknown> | null
  consecutive_failures: number
  total_fetches: number
  total_failures: number
  is_healthy: boolean
  last_success_at: string | null
  last_error_msg: string | null
}

interface ArticleRow {
  id: string
  source_id: string
  title: string
  url: string
  guid: string | null
  author: string | null
  representative_key: string
  content_raw: string | null
}

// Minimal in-memory stand-in for the two tables this Phase 1 slice touches. It is not a SQL
// engine — it pattern-matches the small, fixed set of statements our repositories issue and
// reproduces the constraints that matter for these tests: the partial unique index on
// content.source(url_handle_hash) and the unique index on
// content.article_raw(representative_key_hash), both enforced via ON CONFLICT ... DO NOTHING
// exactly as Postgres would, so a repository bug that skipped the conflict target would show
// up as a failing test here instead of only at real-DB integration time.
export class FakeContentDb {
  readonly sources: SourceRow[] = []
  readonly articles: ArticleRow[] = []
  readonly ecoProjects: { external_key: string; name: string; revoked_at: string | null }[] = []

  query: QueryFn = async (sql, params) => {
    const normalized = sql.replace(/\s+/g, ' ').trim()

    if (normalized.startsWith('INSERT INTO content.source')) {
      const [id, type, name, urlHandle] = params as [string, string, string, string]
      const hash = md5Hex(urlHandle)
      const conflict = this.sources.some(
        (row) => row.revoked_at === null && md5Hex(row.url_handle) === hash
      )
      if (conflict) return { rows: [], rowCount: 0 }
      this.sources.push({
        id,
        type,
        name,
        url_handle: urlHandle,
        revoked_at: null,
        source_meta_json: {},
        consecutive_failures: 0,
        total_fetches: 0,
        total_failures: 0,
        is_healthy: true,
        last_success_at: null,
        last_error_msg: null,
      })
      return { rows: [{ id }], rowCount: 1 }
    }

    if (normalized.startsWith('SELECT id FROM content.source')) {
      const [urlHandle] = params as [string]
      const hash = md5Hex(urlHandle)
      const row = this.sources.find((r) => r.revoked_at === null && md5Hex(r.url_handle) === hash)
      return row ? { rows: [{ id: row.id }], rowCount: 1 } : { rows: [], rowCount: 0 }
    }

    if (normalized.startsWith("SELECT source_meta_json -> 'cursor'")) {
      const [sourceId] = params as [string]
      const row = this.sources.find((r) => r.id === sourceId)
      return { rows: [{ cursor: row?.source_meta_json?.['cursor'] ?? null }], rowCount: 1 }
    }

    if (normalized.startsWith('UPDATE content.source SET source_meta_json')) {
      const [sourceId, cursorJson] = params as [string, string]
      const row = this.sources.find((r) => r.id === sourceId)
      if (row) row.source_meta_json = { ...row.source_meta_json, cursor: JSON.parse(cursorJson) }
      return { rows: [], rowCount: row ? 1 : 0 }
    }

    if (
      normalized.startsWith('UPDATE content.source SET last_fetched_at = now(), last_success_at')
    ) {
      const [sourceId] = params as [string]
      const row = this.sources.find((r) => r.id === sourceId)
      if (row) {
        row.consecutive_failures = 0
        row.total_fetches += 1
        row.is_healthy = true
        row.last_success_at = new Date().toISOString()
      }
      return { rows: [], rowCount: row ? 1 : 0 }
    }

    if (normalized.startsWith('UPDATE content.source SET last_fetched_at = now(), last_error_at')) {
      const [sourceId, errorMessage, threshold] = params as [string, string, number]
      const row = this.sources.find((r) => r.id === sourceId)
      if (!row) return { rows: [], rowCount: 0 }
      row.consecutive_failures += 1
      row.total_fetches += 1
      row.total_failures += 1
      row.last_error_msg = errorMessage
      row.is_healthy = row.consecutive_failures < threshold
      return { rows: [{ consecutive_failures: row.consecutive_failures }], rowCount: 1 }
    }

    if (normalized.startsWith('INSERT INTO content.article_raw')) {
      const [id, sourceId, title, url, guid, , , , , author, contentRaw, representativeKey] =
        params as [
          string,
          string,
          string,
          string,
          string | null,
          string | null,
          string | null,
          Buffer,
          string,
          string | null,
          string | null,
          string,
        ]
      const hash = md5Hex(representativeKey)
      const conflict = this.articles.some((row) => md5Hex(row.representative_key) === hash)
      if (conflict) return { rows: [], rowCount: 0 }
      this.articles.push({
        id,
        source_id: sourceId,
        title,
        url,
        guid,
        author,
        representative_key: representativeKey,
        content_raw: contentRaw,
      })
      return { rows: [], rowCount: 1 }
    }

    if (normalized.startsWith('INSERT INTO content.eco_project')) {
      const [, externalKey, name] = params as [string, string, string]
      const existing = this.ecoProjects.find((p) => p.external_key === externalKey && !p.revoked_at)
      if (existing) {
        existing.name = name
        return { rows: [{ inserted: false }], rowCount: 1 }
      }
      this.ecoProjects.push({ external_key: externalKey, name, revoked_at: null })
      return { rows: [{ inserted: true }], rowCount: 1 }
    }

    if (normalized.startsWith('UPDATE content.eco_project SET revoked_at')) {
      const [keys] = params as [string[]]
      let count = 0
      for (const project of this.ecoProjects) {
        if (keys.includes(project.external_key) && !project.revoked_at) {
          project.revoked_at = new Date().toISOString()
          count++
        }
      }
      return { rows: [], rowCount: count }
    }

    throw new Error(`FakeContentDb: unrecognized query: ${normalized}`)
  }

  // Mirrors python_services/packages/news_collector's agent_comm insertArticle SQL semantics
  // (apps/api/src/modules/agent_comm/agent-comm.service.ts): representative_key = raw url,
  // source looked up/created independently, insert guarded by the same unique index. Used to
  // simulate the *other* pipeline writing into the same tables for the dedup contract test.
  async newsCollectorInsertArticle(input: {
    url: string
    title: string
    sourceName: string
    sourceType: string
  }): Promise<{ id: string; created: boolean }> {
    const urlHash = md5Hex(input.url)
    const existingArticle = this.articles.find((a) => md5Hex(a.representative_key) === urlHash)
    if (existingArticle) return { id: existingArticle.id, created: false }

    let source = this.sources.find((s) => s.name.toLowerCase() === input.sourceName.toLowerCase())
    if (!source) {
      source = {
        id: uuidv7(),
        type: input.sourceType,
        name: input.sourceName,
        url_handle: input.url,
        revoked_at: null,
        source_meta_json: {},
        consecutive_failures: 0,
        total_fetches: 0,
        total_failures: 0,
        is_healthy: true,
        last_success_at: null,
        last_error_msg: null,
      }
      this.sources.push(source)
    }

    const id = uuidv7()
    this.articles.push({
      id,
      source_id: source.id,
      title: input.title,
      url: input.url,
      guid: null,
      author: null,
      representative_key: input.url,
      content_raw: null,
    })
    return { id, created: true }
  }
}

export type { QueryResult }
