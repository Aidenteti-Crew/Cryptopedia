import { describe, expect, it, vi } from 'vitest'

import { classifyArticle, extractJsonObject } from '../src/classify/classify-article.js'
import type { LlmClient } from '../src/classify/llm-client.js'

const article = {
  title: 'Helicon.1 - Improved Snapshot Performance',
  url: 'https://example.com/r/1',
  author: null,
  body: '<p>This version is <b>optional</b>.</p>',
  publishedAt: new Date('2026-10-01T00:00:00Z'),
  sourceName: 'AvalancheGo Releases',
  contentKind: 'RELEASE',
}

const valid = {
  category: 'TECH_UPDATE',
  importance: 3,
  title_ko: '스냅샷 성능 개선',
  summary_ko: 'Helicon.1이 스냅샷 성능을 개선합니다.',
  tech: { network: 'MAINNET', upgrade_name: 'Helicon', version: 'v1.15.1', activated_at: null },
}

function llmReturning(...replies: string[]): LlmClient & { complete: ReturnType<typeof vi.fn> } {
  const complete = vi.fn()
  for (const reply of replies) complete.mockResolvedValueOnce(reply)
  return { complete }
}

describe('extractJsonObject', () => {
  it('reads bare JSON, fenced JSON, and JSON surrounded by prose', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 })
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJsonObject('Sure! Here it is: {"a":{"b":2}} Hope that helps.')).toEqual({
      a: { b: 2 },
    })
  })

  it('rejects replies without an object', () => {
    expect(() => extractJsonObject('no json here')).toThrow('no JSON object')
    expect(() => extractJsonObject('{broken')).toThrow()
  })
})

describe('classifyArticle', () => {
  it('returns the validated classification and keeps the raw JSON', async () => {
    const llm = llmReturning(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``)

    const outcome = await classifyArticle(llm, article)

    expect(outcome.classification).toMatchObject({ category: 'TECH_UPDATE', importance: 3 })
    expect(outcome.classification.tech?.network).toBe('MAINNET')
    expect(outcome.rawJson).toEqual(valid)
  })

  it('strips HTML from the body and tells the model the publication date', async () => {
    const llm = llmReturning(JSON.stringify(valid))

    await classifyArticle(llm, article)

    const user = llm.complete.mock.calls[0]?.[1] as string
    expect(user).toContain('This version is optional .')
    expect(user).not.toContain('<b>')
    expect(user).toContain('Published: 2026-10-01T00:00:00.000Z')
    expect(user).toContain('(RELEASE)')
  })

  it('degrades unknown enum values and malformed dates instead of failing', async () => {
    const llm = llmReturning(
      JSON.stringify({
        ...valid,
        importance: '4.4',
        tech: { network: 'TESTNET-ISH', upgrade_name: '  ', version: 'v1', activated_at: 'soon' },
      })
    )

    const { classification } = await classifyArticle(llm, article)

    expect(classification.importance).toBe(4)
    expect(classification.tech).toEqual({
      network: 'OTHER',
      upgrade_name: null,
      version: 'v1',
      activated_at: null,
    })
  })

  it('retries once with the validation problem quoted, then succeeds', async () => {
    const llm = llmReturning('{"category":"NEWS","importance":9}', JSON.stringify(valid))

    const outcome = await classifyArticle(llm, article)

    expect(outcome.classification.category).toBe('TECH_UPDATE')
    expect(llm.complete).toHaveBeenCalledTimes(2)
    const retryUser = llm.complete.mock.calls[1]?.[1] as string
    expect(retryUser).toContain('Your previous reply was rejected')
    expect(retryUser).toContain('category')
  })

  it('fails after two invalid replies instead of looping', async () => {
    const llm = llmReturning('not json', '{"category":"EVENT"}')

    await expect(classifyArticle(llm, article)).rejects.toThrow('classification failed twice')
    expect(llm.complete).toHaveBeenCalledTimes(2)
  })

  it('truncates very long bodies', async () => {
    const llm = llmReturning(JSON.stringify(valid))

    await classifyArticle(llm, { ...article, body: `<p>${'x'.repeat(20_000)}</p>` })

    const user = llm.complete.mock.calls[0]?.[1] as string
    expect(user.length).toBeLessThan(7000)
    expect(user).toContain('[truncated]')
  })
})
