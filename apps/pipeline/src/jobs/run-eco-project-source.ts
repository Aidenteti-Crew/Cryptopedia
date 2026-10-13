import { GithubProjectDirectoryAdapter } from '../adapters/github-project-directory-adapter.js'
import type { SourceConfig } from '../config/source-config.js'
import { revokeEcoProjects, upsertEcoProjects } from '../db/eco-project-repository.js'
import type { QueryFn } from '../db/query.js'
import {
  getOrCreateSource,
  getSourceCursor,
  recordSourceFailure,
  recordSourceSuccess,
  setSourceCursor,
} from '../db/source-repository.js'

export interface RunEcoProjectSourceResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  sourceId: string
  inserted: number
  updated: number
  revoked: number
}

// Same lifecycle as the article runners (source row, cursor persisted only after the write
// succeeds, health recorded on success/failure), but the records go to content.eco_project
// instead of content.article_raw: a project directory entry is not an article.
export async function runEcoProjectSource(
  query: QueryFn,
  source: SourceConfig,
  adapter = new GithubProjectDirectoryAdapter()
): Promise<RunEcoProjectSourceResult> {
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
        updated: 0,
        revoked: 0,
      }
    }

    const { inserted, updated } = await upsertEcoProjects(query, source.chain, result.projects)
    const revoked = await revokeEcoProjects(query, source.chain, result.removedKeys)
    await setSourceCursor(query, sourceRecord.id, result.cursor)
    await recordSourceSuccess(query, sourceRecord.id)
    return { status: 'SUCCESS', sourceId: sourceRecord.id, inserted, updated, revoked }
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
