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

test('ecosystem subpages request live chain-scoped feeds', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string) => {
    paths.push(input)
    if (input.startsWith('/cryptopedia/')) throw new Error('unexpected static request')
    if (input.includes('/projects?')) return Response.json({
      items: [{ id: 'project-1', key: 'project-1', name: 'Live Project', category: 'Wallets', developer: null, websiteUrl: 'https://example.org', documentationUrl: null, description: 'From crawler', chains: ['avalanche'], sourceUrl: 'https://example.org/source', importance: 4, importanceReason: 'Useful' }],
      categories: [{ name: 'Wallets', count: 1 }], total: 1, generatedAt: '2026-10-14T00:00:00Z',
    })
    if (input.includes('/events?')) return Response.json({ items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' })
    return Response.json({ items: [{ id: 'live-1', title: 'Live item', summary: 'From crawler', kind: input.includes('/macro?') ? 'MACRO' : 'UPDATE', sourceUrl: 'https://example.org/news' }] })
  }) as typeof fetch
  const repository = createCryptopediaRepository(fetcher, 'https://api.example.org/')

  const [projects, macro, updates, archive] = await Promise.all([
    repository.getEcosystemProjects('avalanche'),
    repository.getMacroArticles('avalanche'),
    repository.getUpdates('avalanche'),
    repository.getEvents('avalanche', 'past'),
  ])

  assert.equal(projects.items[0].name, 'Live Project')
  assert.equal(macro[0].title, 'Live item')
  assert.equal(updates[0].kind, 'UPDATE')
  assert.deepEqual(archive.items, [])
  assert.deepEqual(paths.sort(), [
    'https://api.example.org/api/ecosystem/projects?chain=avalanche&limit=500',
    'https://api.example.org/api/ecosystem/macro?chain=avalanche&sort=latest&limit=100',
    'https://api.example.org/api/ecosystem/updates?chain=avalanche&sort=latest&limit=100',
    'https://api.example.org/api/events?chain=avalanche&status=past&limit=100',
  ].sort())
})

test('event overview requests every status so old past events cannot hide upcoming ones', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string) => {
    paths.push(input)
    return Response.json({ items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' })
  }) as typeof fetch

  const feed = await createCryptopediaRepository(fetcher, 'https://api.example.org').getEvents('avalanche')
  assert.deepEqual(feed.items, [])
  assert.deepEqual(paths.sort(), ['upcoming', 'ongoing', 'past', 'cancelled', 'postponed']
    .map((status) => `https://api.example.org/api/events?chain=avalanche&status=${status}&limit=100`)
    .sort())
})
