import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EcoProjectRecord } from '../src/adapters/github-project-directory-adapter.js'
import { createPgConnection, type PgConnection } from '../src/db/pg-pool.js'
import { revokeEcoProjects, upsertEcoProjects } from '../src/db/eco-project-repository.js'

// Needs a Postgres with docs/architecture/avalanche-categories-2026-10-12.sql applied:
//   TEST_DATABASE_URL=postgresql://cherry:cherry_dev@localhost:5432/cherry_db pnpm test
// The fake DB used elsewhere cannot check ON CONFLICT ... WHERE (partial unique index) or xmax.
const url = process.env.TEST_DATABASE_URL
const KEY = `itest-${Date.now()}`

function record(name: string): EcoProjectRecord {
  return {
    externalKey: KEY,
    name,
    category: 'DeFi',
    developer: 'Dev',
    websiteUrl: 'https://example.com',
    documentationUrl: null,
    description: null,
    chains: ['C-Chain', 'Dexalot'],
    sourceUrl: `https://build.avax.network/integrations/${KEY}`,
  }
}

describe.skipIf(!url)('eco-project-repository (real Postgres)', () => {
  let connection: PgConnection

  beforeAll(() => {
    connection = createPgConnection(url!)
  })

  afterAll(async () => {
    await connection.query('DELETE FROM content.eco_project WHERE external_key = $1', [KEY])
    await connection.close()
  })

  it('inserts once, updates in place, and allows re-adding a key after it was revoked', async () => {
    expect(await upsertEcoProjects(connection.query, [record('First')])).toEqual({
      inserted: 1,
      updated: 0,
    })
    expect(await upsertEcoProjects(connection.query, [record('Renamed')])).toEqual({
      inserted: 0,
      updated: 1,
    })

    const rows = await connection.query(
      'SELECT name, chains, revoked_at FROM content.eco_project WHERE external_key = $1',
      [KEY]
    )
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0]).toMatchObject({ name: 'Renamed', chains: ['C-Chain', 'Dexalot'] })

    expect(await revokeEcoProjects(connection.query, [KEY, 'does-not-exist'])).toBe(1)
    expect(await revokeEcoProjects(connection.query, [KEY])).toBe(0)

    // The unique index only covers active rows, so the key can be inserted again.
    expect(await upsertEcoProjects(connection.query, [record('Back')])).toEqual({
      inserted: 1,
      updated: 0,
    })
  })
})
