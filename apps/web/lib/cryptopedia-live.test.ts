import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createCryptopediaRepository, CryptopediaDataError } from './cryptopedia-data'
const page = JSON.parse(readFileSync(new URL('../public/cryptopedia/ecosystem.json', import.meta.url), 'utf8'))
test('home scopes live requests and replaces preview news', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string, init?: RequestInit) => {
    paths.push(input)
    if (input.startsWith('/cryptopedia/')) return Response.json(page)
    assert.equal(init?.cache, 'no-store')
    assert.ok(init?.signal)
    if (input.includes('/events?')) return Response.json({ items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' })
    return Response.json({ items: [{ id: input.includes('/macro?') ? 'live-macro' : 'live-update', title: 'Live', summary: 'Collected', kind: input.includes('/macro?') ? 'MACRO' : 'UPDATE', sourceUrl: 'https://example.org/news' }] })
  }) as typeof fetch
  const result = await createCryptopediaRepository(fetcher, 'https://api.example.org/').getEcosystem('avalanche')
  assert.deepEqual(result.latest.map(item => item.id), ['live-macro', 'live-update'])
  assert.equal(paths.filter(path => path.includes('chain=avalanche&limit=4')).length, 3)
  assert.ok(paths.some(path => path.includes('status=upcoming')))
})
test('unavailable live feed fails instead of showing preview articles', async () => {
  const fetcher = (async (input: string) => input.startsWith('/cryptopedia/') ? Response.json(page) : new Response('', { status: 503 })) as typeof fetch
  await assert.rejects(createCryptopediaRepository(fetcher).getEcosystem(), (error: unknown) => error instanceof CryptopediaDataError && error.kind === 'network')
})
