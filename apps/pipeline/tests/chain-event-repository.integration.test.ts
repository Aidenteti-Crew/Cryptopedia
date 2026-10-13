import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mapLumaEvent } from '../src/adapters/luma-calendar-adapter.js'
import { upsertChainEvents } from '../src/db/chain-event-repository.js'
import { createPgConnection, type PgConnection } from '../src/db/pg-pool.js'
import { parseIcsEvents } from '../src/events/ics.js'
import type { ChainEventInput } from '../src/events/types.js'
import { calendar, KOREA_EVENT } from './support/luma-fixture.js'

// Needs Postgres with docs/architecture/avalanche-categories-2026-10-12.sql applied
// (TEST_DATABASE_URL). Checks the real ON CONFLICT (chain, event_key) upsert.
const url = process.env.TEST_DATABASE_URL
const CHAIN = `itest-${Date.now()}`

describe.skipIf(!url)('chain-event-repository (real Postgres)', () => {
  let connection: PgConnection
  let event: ChainEventInput

  beforeAll(() => {
    connection = createPgConnection(url!)
    const [ev] = parseIcsEvents(calendar('Team1 Korea', KOREA_EVENT))
    const mapped = mapLumaEvent(ev!, { chain: CHAIN, calendarName: 'Team1 Korea' })
    if (!('event' in mapped)) throw new Error('fixture did not map')
    event = mapped.event
  })

  afterAll(async () => {
    await connection.query('DELETE FROM content.chain_event WHERE chain = $1', [CHAIN])
    await connection.close()
  })

  it('inserts once and then updates the same event in place when it is rescheduled', async () => {
    expect(await upsertChainEvents(connection.query, [event])).toEqual({ inserted: 1, updated: 0 })

    const rescheduled = {
      ...event,
      startsAt: new Date('2026-10-24T05:00:00Z'),
      endsAt: new Date('2026-10-24T07:00:00Z'),
      venueName: '새 장소',
    }
    expect(await upsertChainEvents(connection.query, [rescheduled])).toEqual({
      inserted: 0,
      updated: 1,
    })

    const rows = await connection.query(
      `SELECT starts_at, venue_name, country, timezone, tags, confidence::float AS confidence
         FROM content.chain_event WHERE chain = $1`,
      [CHAIN]
    )
    expect(rows.rows).toEqual([
      {
        starts_at: new Date('2026-10-24T05:00:00Z'),
        venue_name: '새 장소',
        country: 'KR',
        timezone: 'Asia/Seoul',
        tags: ['Avalanche', 'Team1', 'Team1 Korea'],
        confidence: 1,
      },
    ])
  })
})
