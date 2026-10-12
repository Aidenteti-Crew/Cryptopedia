import { v7 as uuidv7 } from 'uuid'

import type { EcoProjectRecord } from '../adapters/github-project-directory-adapter.js'
import type { QueryFn } from './query.js'

function truncate(value: string | null, maxLength: number): string | null {
  return value !== null && value.length > maxLength ? value.slice(0, maxLength) : value
}

export interface UpsertEcoProjectsResult {
  inserted: number
  updated: number
}

// content.eco_project is keyed by external_key (the entry's file name) through a partial unique
// index (WHERE revoked_at IS NULL), so a re-run updates the row in place instead of duplicating
// it. `xmax = 0` is true only for rows the statement actually inserted, which gives an
// inserted/updated split without a second query.
export async function upsertEcoProjects(
  query: QueryFn,
  projects: EcoProjectRecord[]
): Promise<UpsertEcoProjectsResult> {
  let inserted = 0
  let updated = 0
  for (const project of projects) {
    const result = await query(
      `INSERT INTO content.eco_project (
         id, external_key, name, category, developer, website_url,
         documentation_url, description, chains, source_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (external_key) WHERE (revoked_at IS NULL) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         developer = EXCLUDED.developer,
         website_url = EXCLUDED.website_url,
         documentation_url = EXCLUDED.documentation_url,
         description = EXCLUDED.description,
         chains = EXCLUDED.chains,
         source_url = EXCLUDED.source_url
       RETURNING (xmax = 0) AS inserted`,
      [
        uuidv7(),
        truncate(project.externalKey, 200),
        truncate(project.name, 200),
        truncate(project.category, 100),
        truncate(project.developer, 200),
        truncate(project.websiteUrl, 1000),
        truncate(project.documentationUrl, 1000),
        project.description,
        project.chains,
        truncate(project.sourceUrl, 1000),
      ]
    )
    const row = result.rows[0] as { inserted: boolean } | undefined
    if (row?.inserted) inserted++
    else updated++
  }
  return { inserted, updated }
}

export async function revokeEcoProjects(query: QueryFn, externalKeys: string[]): Promise<number> {
  if (externalKeys.length === 0) return 0
  const result = await query(
    `UPDATE content.eco_project SET revoked_at = now()
     WHERE external_key = ANY($1::text[]) AND revoked_at IS NULL`,
    [externalKeys]
  )
  return result.rowCount ?? 0
}
