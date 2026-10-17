import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createCryptopediaRepository } from './cryptopedia-data'
import { createSnapshotFetch, snapshotFileFor } from './cryptopedia-live-snapshot'

// 브라우저 대신 public/ 아래 파일을 그대로 돌려주는 fetch
const publicFetch = (async (input: string) => {
  const file = new URL(`../public${input}`, import.meta.url)
  return Response.json(JSON.parse(readFileSync(file, 'utf8')))
}) as typeof fetch

test('API requests map to the checked-in snapshot files', () => {
  assert.equal(
    snapshotFileFor('/api/ecosystem/projects?chain=avalanche&limit=500'),
    'ecosystem-projects.json'
  )
  assert.equal(
    snapshotFileFor('/api/ecosystem/macro?chain=avalanche&limit=4'),
    'ecosystem-macro.json'
  )
  assert.equal(
    snapshotFileFor('/api/events?chain=avalanche&status=past&limit=100'),
    'events-past.json'
  )
  assert.equal(snapshotFileFor('/cryptopedia/hub.json'), null)
})

test('without an API server every LIVE screen loads from the snapshot', async () => {
  const repository = createCryptopediaRepository(createSnapshotFetch(publicFetch), '')
  assert.ok((await repository.getEcosystemProjects('avalanche')).items.length > 0)
  assert.ok((await repository.getMacroArticles('avalanche')).length > 0)
  assert.ok((await repository.getUpdates('avalanche')).length > 0)
  assert.ok((await repository.getEvents('avalanche')).items.length > 0)
  assert.ok((await repository.getEvents('avalanche', 'past')).items.length > 0)
  const home = await repository.getEcosystem('avalanche')
  // 홈은 소식마다 limit=4 만큼만 받는다
  assert.ok(home.latest.length > 0 && home.latest.length <= 12)
})
