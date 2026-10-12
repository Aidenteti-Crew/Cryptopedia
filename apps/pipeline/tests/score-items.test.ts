import { describe, expect, it, vi } from 'vitest'

import type { LlmClient } from '../src/classify/llm-client.js'
import { SYSTEM_PROMPT } from '../src/classify/prompt.js'
import { IMPORTANCE_RUBRIC } from '../src/classify/rubric.js'
import { scoreBatch, scoreSystemPrompt, type ScoreItem } from '../src/classify/score-items.js'

const items: ScoreItem[] = [
  { id: 'a', facts: { name: 'Chainlink', category: 'Oracles' } },
  { id: 'b', facts: { name: 'Tiny dApp', category: 'DeFi' } },
]

function llm(...replies: string[]) {
  const complete = vi.fn()
  replies.forEach((r) => complete.mockResolvedValueOnce(r))
  return { complete } as LlmClient & { complete: ReturnType<typeof vi.fn> }
}

describe('shared importance rubric', () => {
  it('is the same scale in article classification and in project/event scoring', () => {
    expect(IMPORTANCE_RUBRIC).toContain(
      '5점: 모두가 알아야 함. 영향이 넓고, 급하고, 바로 실행 가능하고, 오래 감.'
    )
    expect(IMPORTANCE_RUBRIC).toContain('1점: 가치 없음. 낡은 정보, 과장, 근거 부족.')
    expect(SYSTEM_PROMPT).toContain(IMPORTANCE_RUBRIC)
    expect(scoreSystemPrompt('PROJECT')).toContain(IMPORTANCE_RUBRIC)
    expect(scoreSystemPrompt('EVENT')).toContain(IMPORTANCE_RUBRIC)
  })
})

describe('scoreBatch', () => {
  it('sends all items in one request and maps scores back by id', async () => {
    const model = llm(
      JSON.stringify({
        scores: [
          { id: 'a', importance: 5, reason: '핵심 오라클' },
          { id: 'b', importance: '2', reason: '작은 프로젝트' },
        ],
      })
    )

    const scores = await scoreBatch(model, 'PROJECT', items)

    expect(model.complete).toHaveBeenCalledTimes(1)
    expect(JSON.parse(model.complete.mock.calls[0]?.[1] as string)).toEqual([
      { id: 'a', name: 'Chainlink', category: 'Oracles' },
      { id: 'b', name: 'Tiny dApp', category: 'DeFi' },
    ])
    expect(Object.fromEntries(scores)).toEqual({
      a: { importance: 5, reason: '핵심 오라클' },
      b: { importance: 2, reason: '작은 프로젝트' },
    })
  })

  it('ignores invented ids and leaves missing ones unscored', async () => {
    const model = llm(
      JSON.stringify({
        scores: [
          { id: 'a', importance: 4, reason: 'r' },
          { id: 'zzz', importance: 5, reason: 'r' },
        ],
      })
    )

    const scores = await scoreBatch(model, 'PROJECT', items)

    expect([...scores.keys()]).toEqual(['a'])
  })

  it('retries once on an invalid reply and fails after a second one', async () => {
    const ok = JSON.stringify({ scores: [{ id: 'a', importance: 3, reason: 'r' }] })
    expect((await scoreBatch(llm('nope', ok), 'EVENT', items)).get('a')?.importance).toBe(3)

    await expect(
      scoreBatch(
        llm('{"scores": [{"id": "a", "importance": 9, "reason": "r"}]}', 'still nope'),
        'EVENT',
        items
      )
    ).rejects.toThrow()
  })
})
