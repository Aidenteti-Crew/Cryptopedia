import { describe, expect, it } from 'vitest'

import { LlmFatalError, type LlmClient } from '../src/classify/llm-client.js'
import type { QueryFn } from '../src/db/query.js'
import { runScore } from '../src/jobs/run-score.js'

function fakeQuery(ids: string[]) {
  const saved: unknown[][] = []
  const query: QueryFn = async (sql, params) => {
    if (sql.includes('SELECT id, name')) {
      return {
        rows: ids.map((id) => ({
          id,
          name: `P${id}`,
          category: null,
          developer: null,
          description: null,
          chains: [],
        })),
        rowCount: ids.length,
      }
    }
    if (sql.includes('UPDATE content.eco_project')) {
      saved.push(params)
      return { rows: [], rowCount: 1 }
    }
    throw new Error(`unexpected query: ${sql}`)
  }
  return { query, saved }
}

// Scores every id it is given; a batch containing "bad" fails.
const llm: LlmClient = {
  complete: async (_s, user) => {
    const batch = JSON.parse(user.split('\n\n')[0]!) as { id: string }[]
    if (batch.some((b) => b.id === 'bad')) return 'not json'
    return JSON.stringify({
      scores: batch.map((b) => ({ id: b.id, importance: 3, reason: '배경 지식' })),
    })
  },
}

const options = {
  kind: 'PROJECT' as const,
  chain: 'avalanche',
  modelName: 'm',
  limit: 100,
  batchSize: 2,
  concurrency: 2,
}

describe('runScore', () => {
  it('scores in batches and stores importance, reason and model', async () => {
    const { query, saved } = fakeQuery(['1', '2', '3'])

    const summary = await runScore(query, llm, options)

    expect(summary).toMatchObject({
      pending: 3,
      scored: 3,
      unscored: 0,
      failedBatches: 0,
      distribution: { 3: 3 },
    })
    expect(saved).toContainEqual(['1', 3, '배경 지식', 'm'])
  })

  it('leaves a failed batch unscored for the next run and keeps going', async () => {
    const { query, saved } = fakeQuery(['1', 'bad', '3', '4'])

    const summary = await runScore(query, llm, options)

    expect(summary).toMatchObject({ scored: 2, unscored: 2, failedBatches: 1 })
    expect(saved.map((p) => p[0]).sort()).toEqual(['3', '4'])
  })

  it('stops on a fatal LLM error', async () => {
    const { query, saved } = fakeQuery(['1', '2'])
    const fatal: LlmClient = {
      complete: async () => {
        throw new LlmFatalError('LLM authentication failed (401)')
      },
    }

    const summary = await runScore(query, fatal, options)

    expect(summary.stoppedEarly).toContain('401')
    expect(saved).toEqual([])
  })
})
