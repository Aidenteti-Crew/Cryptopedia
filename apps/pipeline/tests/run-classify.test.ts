import { describe, expect, it, vi } from 'vitest'

import { LlmFatalError, type LlmClient } from '../src/classify/llm-client.js'
import type { QueryFn } from '../src/db/query.js'
import { runClassify, type ClassifyOptions } from '../src/jobs/run-classify.js'

const SOURCE = 'https://github.com/ava-labs/avalanchego/releases.atom'

function row(id: string, title: string) {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    author: null,
    body: 'body',
    published_at: new Date('2026-10-01T00:00:00Z'),
    source_name: 'AvalancheGo Releases',
    source_url: SOURCE,
  }
}

// Stub for the handful of statements run-classify issues. Category tables report "created" the
// first time an id is seen and "already there" afterwards, like ON CONFLICT DO NOTHING.
function fakeQuery(pending: ReturnType<typeof row>[]) {
  const writes: { sql: string; params: unknown[] }[] = []
  const seen = new Set<string>()
  const query: QueryFn = async (sql, params) => {
    const text = sql.replace(/\s+/g, ' ').trim()
    if (text.startsWith('SELECT a.id')) return { rows: pending, rowCount: pending.length }
    if (text.startsWith('SELECT 1 FROM pg_timezone_names')) {
      return { rows: [], rowCount: params[0] === 'Atlantic/Reykjavik' ? 0 : 1 }
    }
    writes.push({ sql: text, params })
    if (text.startsWith('INSERT INTO content.tech_update')) {
      const key = `tech:${params[1]}`
      const created = !seen.has(key)
      seen.add(key)
      return { rows: [], rowCount: created ? 1 : 0 }
    }
    if (text.startsWith('INSERT INTO content.chain_event')) {
      const key = `event:${params[1]}`
      const created = !seen.has(key)
      seen.add(key)
      return { rows: [], rowCount: created ? 1 : 0 }
    }
    return { rows: [], rowCount: 1 }
  }
  return { query, writes }
}

const tech = JSON.stringify({
  category: 'TECH_UPDATE',
  importance: 3,
  summary_ko: '요약',
  tech: { network: 'MAINNET', version: 'v1' },
})
const other = JSON.stringify({ category: 'NOISE', importance: 1, summary_ko: '인사' })
const undatedEvent = JSON.stringify({
  category: 'EVENT',
  importance: 3,
  summary_ko: '행사',
  event: { name: 'Meetup', starts_at: null },
})

const options: ClassifyOptions = {
  sourcesByUrl: { [SOURCE]: { contentKind: 'RELEASE', chain: 'avalanche' } },
  modelName: 'test-model',
  limit: 10,
  concurrency: 2,
  maxAttempts: 3,
  dryRun: false,
}

function llmByTitle(replies: Record<string, string | Error>): LlmClient {
  return {
    complete: vi.fn(async (_system: string, user: string) => {
      const title = /Title: (.*)/.exec(user)?.[1] ?? ''
      const reply = replies[title]
      if (reply instanceof Error) throw reply
      return reply ?? other
    }),
  }
}

describe('runClassify', () => {
  it('writes category rows and classification records and summarises by category', async () => {
    const { query, writes } = fakeQuery([
      row('1', 'Release'),
      row('2', 'Hello'),
      row('3', 'Meetup'),
    ])
    const llm = llmByTitle({ Release: tech, Hello: other, Meetup: undatedEvent })

    const summary = await runClassify(query, llm, options)

    expect(summary).toMatchObject({
      processed: 3,
      succeeded: 3,
      failed: 0,
      byCategory: { TECH_UPDATE: 1, NOISE: 1, EVENT: 1 },
      inserted: { TECH_UPDATE: 1 },
      skipped: { 'event start date not confirmed': 1 },
    })
    // Every article gets a classification record, but only classified ones got a category row.
    expect(
      writes.filter((w) => w.sql.startsWith('INSERT INTO content.article_classification'))
    ).toHaveLength(3)
    expect(writes.filter((w) => w.sql.startsWith('INSERT INTO content.tech_update'))).toHaveLength(
      1
    )
    expect(writes.some((w) => w.sql.startsWith('INSERT INTO content.chain_event'))).toBe(false)
  })

  it('writes nothing in dry-run mode but still reports what would be inserted', async () => {
    const { query, writes } = fakeQuery([row('1', 'Release')])

    const summary = await runClassify(query, llmByTitle({ Release: tech }), {
      ...options,
      dryRun: true,
    })

    expect(writes).toEqual([])
    expect(summary).toMatchObject({ succeeded: 1, inserted: { TECH_UPDATE: 1 } })
  })

  it('records a failed article as FAILED and keeps going', async () => {
    const { query, writes } = fakeQuery([row('1', 'Broken'), row('2', 'Release')])
    const llm = llmByTitle({ Broken: new Error('model exploded'), Release: tech })

    const summary = await runClassify(query, llm, options)

    expect(summary).toMatchObject({ processed: 2, succeeded: 1, failed: 1 })
    const failure = writes.find((w) => w.sql.includes("'FAILED'"))
    expect(failure?.params).toEqual([expect.any(String), '1', 'test-model', 'model exploded'])
  })

  it('stops on a fatal LLM error without marking the remaining articles failed', async () => {
    const { query, writes } = fakeQuery([row('1', 'A'), row('2', 'B'), row('3', 'C')])
    const llm = llmByTitle({
      A: new LlmFatalError('LLM authentication failed (401)'),
      B: new LlmFatalError('LLM authentication failed (401)'),
      C: new LlmFatalError('LLM authentication failed (401)'),
    })

    const summary = await runClassify(query, llm, { ...options, concurrency: 1 })

    expect(summary.stoppedEarly).toContain('authentication failed')
    expect(summary.failed).toBe(0)
    expect(writes).toEqual([])
  })

  it('counts a repeated category row as a duplicate instead of an insert', async () => {
    const { query } = fakeQuery([row('1', 'Release'), row('1', 'Release')])

    const summary = await runClassify(query, llmByTitle({ Release: tech }), {
      ...options,
      concurrency: 1,
    })

    expect(summary.inserted).toEqual({ TECH_UPDATE: 1 })
    expect(summary.duplicates).toBe(1)
  })

  it('skips an event whose timezone Postgres does not know instead of storing it', async () => {
    const { query, writes } = fakeQuery([row('1', 'Meetup')])
    const event = JSON.stringify({
      category: 'EVENT',
      importance: 3,
      summary_ko: '행사',
      event: {
        name: 'Meetup',
        starts_at: '2026-10-20T10:00:00+00:00',
        timezone: 'Europe/London',
      },
    })
    // Same event, but the stub's Postgres rejects this zone name.
    const unknownZone = event.replace('Europe/London', 'Atlantic/Reykjavik')

    const known = await runClassify(query, llmByTitle({ Meetup: event }), options)
    expect(known.inserted).toEqual({ EVENT: 1 })

    const rejected = await runClassify(query, llmByTitle({ Meetup: unknownZone }), options)
    expect(rejected.inserted).toEqual({})
    expect(rejected.skipped).toEqual({ 'event timezone unknown to Postgres': 1 })
    expect(writes.filter((w) => w.sql.startsWith('INSERT INTO content.chain_event'))).toHaveLength(
      1
    )
  })

  it('does nothing when there is nothing pending', async () => {
    const { query } = fakeQuery([])

    expect(await runClassify(query, llmByTitle({}), options)).toMatchObject({
      processed: 0,
      failed: 0,
    })
  })

  it('processes articles concurrently up to the limit', async () => {
    const { query } = fakeQuery([row('1', 'A'), row('2', 'B'), row('3', 'C'), row('4', 'D')])
    let active = 0
    let peak = 0
    const llm: LlmClient = {
      complete: async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((resolve) => setTimeout(resolve, 15))
        active--
        return other
      },
    }

    await runClassify(query, llm, { ...options, concurrency: 3 })

    expect(peak).toBe(3)
  })
})
