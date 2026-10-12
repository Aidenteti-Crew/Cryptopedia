import { describe, expect, it, vi } from 'vitest'

import {
  LlmFatalError,
  OpenAiCompatibleClient,
  llmConfigFromEnv,
} from '../src/classify/llm-client.js'

const config = { baseUrl: 'https://llm.test/v1', apiKey: 'k', model: 'm' }

function reply(content: string | null, extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content, ...extra } }] }), {
    status: 200,
  })
}

function client(responses: (Response | Error)[]) {
  const fetchFn = vi.fn(async () => {
    const next = responses.shift()
    if (!next) throw new Error('no more responses')
    if (next instanceof Error) throw next
    return next
  })
  const sleep = vi.fn(async (_ms: number) => undefined)
  return { llm: new OpenAiCompatibleClient(config, fetchFn, sleep, 3), fetchFn, sleep }
}

describe('OpenAiCompatibleClient', () => {
  it('posts a chat completion with the key and returns the content', async () => {
    const { llm, fetchFn } = client([reply(' {"ok":true} ')])

    expect(await llm.complete('sys', 'user')).toBe('{"ok":true}')

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://llm.test/v1/chat/completions')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer k')
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({ model: 'm', temperature: 0 })
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'user' },
    ])
    expect(body.response_format).toBeUndefined()
  })

  it('falls back to reasoning_content when content is null', async () => {
    const { llm } = client([reply(null, { reasoning_content: '{"a":1}' })])

    expect(await llm.complete('s', 'u')).toBe('{"a":1}')
  })

  it('retries 429 honouring Retry-After, then succeeds', async () => {
    const limited = new Response('', { status: 429, headers: { 'retry-after': '7' } })
    const { llm, sleep } = client([limited, reply('ok')])

    expect(await llm.complete('s', 'u')).toBe('ok')
    expect(sleep).toHaveBeenCalledWith(7000)
  })

  it('retries server errors and network failures with growing waits', async () => {
    const { llm, sleep } = client([
      new Response('', { status: 503 }),
      new Error('socket hang up'),
      reply('ok'),
    ])

    expect(await llm.complete('s', 'u')).toBe('ok')
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([2000, 4000])
  })

  it('gives up after the attempt limit and reports the last problem', async () => {
    const { llm, fetchFn } = client([
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
    ])

    await expect(llm.complete('s', 'u')).rejects.toThrow(
      'failed after 3 attempts: LLM request failed: 500'
    )
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('treats a bad key or unknown model as fatal without retrying', async () => {
    const auth = client([new Response('', { status: 401 })])
    await expect(auth.llm.complete('s', 'u')).rejects.toBeInstanceOf(LlmFatalError)
    expect(auth.fetchFn).toHaveBeenCalledTimes(1)

    const missing = client([new Response('', { status: 404 })])
    await expect(missing.llm.complete('s', 'u')).rejects.toThrow('not found (404)')
  })

  it('retries an empty reply', async () => {
    const { llm } = client([reply(''), reply('{"a":1}')])

    expect(await llm.complete('s', 'u')).toBe('{"a":1}')
  })
})

describe('llmConfigFromEnv', () => {
  it('requires key and model and defaults to the NVIDIA endpoint', () => {
    expect(() => llmConfigFromEnv({})).toThrow('LLM_API_KEY')
    expect(() => llmConfigFromEnv({ LLM_API_KEY: 'k' })).toThrow('LLM_MODEL')
    expect(llmConfigFromEnv({ LLM_API_KEY: 'k', LLM_MODEL: 'm' }).baseUrl).toBe(
      'https://integrate.api.nvidia.com/v1'
    )
    expect(
      llmConfigFromEnv({ LLM_API_KEY: 'k', LLM_MODEL: 'm', LLM_BASE_URL: 'https://x/v1/' }).baseUrl
    ).toBe('https://x/v1')
  })
})
