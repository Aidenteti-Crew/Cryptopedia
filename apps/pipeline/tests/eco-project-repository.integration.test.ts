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
    expect(await upsertEcoProjects(connection.query, 'avalanche', [record('First')])).toEqual({
      inserted: 1,
      updated: 0,
    })
    expect(await upsertEcoProjects(connection.query, 'avalanche', [record('Renamed')])).toEqual({
      inserted: 0,
      updated: 1,
    })

    const rows = await connection.query(
      'SELECT name, chains, revoked_at FROM content.eco_project WHERE external_key = $1',
      [KEY]
    )
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0]).toMatchObject({ name: 'Renamed', chains: ['C-Chain', 'Dexalot'] })

    expect(await revokeEcoProjects(connection.query, 'avalanche', [KEY, 'does-not-exist'])).toBe(1)
    expect(await revokeEcoProjects(connection.query, 'avalanche', [KEY])).toBe(0)

    // The unique index only covers active rows, so the key can be inserted again.
    expect(await upsertEcoProjects(connection.query, 'avalanche', [record('Back')])).toEqual({
      inserted: 1,
      updated: 0,
    })
  })

  it('keeps the same project key separately per chain', async () => {
    await upsertEcoProjects(connection.query, 'avalanche', [record('Avalanche entry')])
    expect(
      await upsertEcoProjects(connection.query, 'itest-other-chain', [record('Other')])
    ).toEqual({ inserted: 1, updated: 0 })

    const rows = await connection.query(
      `SELECT chain, name FROM content.eco_project
        WHERE external_key = $1 AND revoked_at IS NULL ORDER BY chain`,
      [KEY]
    )
    expect(rows.rows).toEqual([
      { chain: 'avalanche', name: 'Avalanche entry' },
      { chain: 'itest-other-chain', name: 'Other' },
    ])
    // Revoking on one chain leaves the other chain's row alone.
    expect(await revokeEcoProjects(connection.query, 'itest-other-chain', [KEY])).toBe(1)
    const left = await connection.query(
      'SELECT chain FROM content.eco_project WHERE external_key = $1 AND revoked_at IS NULL',
      [KEY]
    )
    expect(left.rows).toEqual([{ chain: 'avalanche' }])
  })
})
