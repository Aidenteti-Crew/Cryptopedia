import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createCryptopediaRepository, CryptopediaDataError } from './cryptopedia-data'
const page = JSON.parse(
  readFileSync(new URL('../public/cryptopedia/ecosystem.json', import.meta.url), 'utf8')
)
test('home scopes live requests and replaces preview news', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string, init?: RequestInit) => {
    paths.push(input)
    if (input.startsWith('/cryptopedia/')) return Response.json(page)
    assert.equal(init?.cache, 'no-store')
    assert.ok(init?.signal)
    if (input.includes('/events?'))
      return Response.json({ items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' })
    return Response.json({
      items: [
        {
          id: input.includes('/macro?') ? 'live-macro' : 'live-update',
          title: 'Live',
          summary: 'Collected',
          kind: input.includes('/macro?') ? 'MACRO' : 'UPDATE',
          sourceUrl: 'https://example.org/news',
        },
      ],
    })
  }) as typeof fetch
  const result = await createCryptopediaRepository(
    fetcher,
    'https://api.example.org/'
  ).getEcosystem('avalanche')
  assert.deepEqual(
    result.latest.map((item) => item.id),
    ['live-macro', 'live-update']
  )
  assert.equal(paths.filter((path) => path.includes('chain=avalanche&limit=4')).length, 3)
  assert.ok(paths.some((path) => path.includes('status=upcoming')))
})
test('unavailable live feed fails instead of showing preview articles', async () => {
  const fetcher = (async (input: string) =>
    input.startsWith('/cryptopedia/')
      ? Response.json(page)
      : new Response('', { status: 503 })) as typeof fetch
  await assert.rejects(
    createCryptopediaRepository(fetcher).getEcosystem(),
    (error: unknown) => error instanceof CryptopediaDataError && error.kind === 'network'
  )
})

test('ecosystem subpages request live chain-scoped feeds', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string) => {
    paths.push(input)
    if (input.startsWith('/cryptopedia/')) throw new Error('unexpected static request')
    if (input.includes('/projects?'))
      return Response.json({
        items: [
          {
            id: 'project-1',
            key: 'project-1',
            name: 'Live Project',
            category: 'Wallets',
            developer: null,
            websiteUrl: 'https://example.org',
            documentationUrl: null,
            description: 'From crawler',
            chains: ['avalanche'],
            sourceUrl: 'https://example.org/source',
            importance: 4,
            importanceReason: 'Useful',
          },
        ],
        categories: [{ name: 'Wallets', count: 1 }],
        total: 1,
        generatedAt: '2026-10-14T00:00:00Z',
      })
    if (input.includes('/events?'))
      return Response.json({ items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' })
    return Response.json({
      items: [
        {
          id: 'live-1',
          title: 'Live item',
          summary: 'From crawler',
          kind: input.includes('/macro?') ? 'MACRO' : 'UPDATE',
          sourceUrl: 'https://example.org/news',
        },
      ],
    })
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
  assert.deepEqual(
    paths.sort(),
    [
      'https://api.example.org/api/ecosystem/projects?chain=avalanche&limit=500',
      'https://api.example.org/api/ecosystem/macro?chain=avalanche&sort=latest&limit=100',
      'https://api.example.org/api/ecosystem/updates?chain=avalanche&sort=latest&limit=100',
      'https://api.example.org/api/events?chain=avalanche&status=past&limit=100',
    ].sort()
  )
})

test('event overview requests every status so old past events cannot hide upcoming ones', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string) => {
    paths.push(input)
    return Response.json({ items: [], nextCursor: null, generatedAt: '2026-10-14T00:00:00Z' })
  }) as typeof fetch

  const feed = await createCryptopediaRepository(fetcher, 'https://api.example.org').getEvents(
    'avalanche'
  )
  assert.deepEqual(feed.items, [])
  assert.deepEqual(
    paths.sort(),
    ['upcoming', 'ongoing', 'past', 'cancelled', 'postponed']
      .map(
        (status) => `https://api.example.org/api/events?chain=avalanche&status=${status}&limit=100`
      )
      .sort()
  )
})

test('update search receives every page, including releases beyond the first hundred', async () => {
  const paths: string[] = []
  const fetcher = (async (input: string) => {
    paths.push(input)
    const next = input.includes('cursor=older')
    return Response.json({
      items: next
        ? [
            {
              id: 'release-101',
              title: 'Older release',
              summary: '',
              kind: 'UPDATE',
              network: 'FUJI',
              prerelease: true,
            },
          ]
        : Array.from({ length: 100 }, (_, i) => ({
            id: `release-${i}`,
            title: `Release ${i}`,
            summary: '',
            kind: 'UPDATE',
          })),
      nextCursor: next ? null : 'older',
    })
  }) as typeof fetch
  const result = await createCryptopediaRepository(fetcher, 'https://api.example.org').getUpdates(
    'avalanche'
  )
  assert.equal(result.length, 101)
  assert.equal(result.at(-1)?.prerelease, true)
  assert.equal(result.at(-1)?.network, 'FUJI')
  assert.match(paths[1], /&cursor=older$/)
})

test('a repeated update cursor fails explicitly instead of looping or silently truncating', async () => {
  const fetcher = (async () => Response.json({ items: [], nextCursor: 'repeated' })) as typeof fetch
  await assert.rejects(
    createCryptopediaRepository(fetcher).getUpdates(),
    (error: unknown) => error instanceof CryptopediaDataError && error.kind === 'validation'
  )
})

test('project directory and macro search load pages beyond their original limits', async () => {
  const project = {
    id: 'p',
    key: 'p',
    name: 'Project',
    category: 'Wallets',
    developer: null,
    websiteUrl: null,
    documentationUrl: null,
    description: null,
    chains: ['avalanche'],
    sourceUrl: null,
    importance: null,
    importanceReason: null,
  }
  const fetcher = (async (input: string) => {
    const second = input.includes('cursor=')
    if (input.includes('/projects?'))
      return Response.json({
        items: second
          ? [{ ...project, id: 'p500', key: 'p500' }]
          : Array.from({ length: 500 }, (_, i) => ({ ...project, id: `p${i}`, key: `p${i}` })),
        categories: [{ name: 'Wallets', count: 501 }],
        total: 501,
        generatedAt: '2026-10-15T00:00:00Z',
        nextCursor: second ? null : 'projects-next',
      })
    return Response.json({
      items: second
        ? [{ id: 'm100', title: 'Older macro', summary: '', kind: 'MACRO' }]
        : Array.from({ length: 100 }, (_, i) => ({
            id: `m${i}`,
            title: `Macro ${i}`,
            summary: '',
            kind: 'MACRO',
          })),
      nextCursor: second ? null : 'macro-next',
    })
  }) as typeof fetch
  const repo = createCryptopediaRepository(fetcher, 'https://api.example.org')
  assert.equal((await repo.getEcosystemProjects()).items.length, 501)
  assert.equal((await repo.getMacroArticles()).length, 101)
})

test('event repository follows the status cursor rather than discarding the next page', async () => {
  const fixture = JSON.parse(
    readFileSync(new URL('../public/cryptopedia/events.json', import.meta.url), 'utf8')
  ).items[0]
  const fetcher = (async (input: string) =>
    Response.json({
      items: [{ ...fixture, id: input.includes('cursor=') ? 'older-event' : 'first-event' }],
      nextCursor: input.includes('cursor=') ? null : 'older',
      generatedAt: '2026-10-15T00:00:00Z',
    })) as typeof fetch
  const feed = await createCryptopediaRepository(fetcher).getEvents('avalanche', 'past')
  assert.deepEqual(
    feed.items.map((e) => e.id),
    ['first-event', 'older-event']
  )
})
