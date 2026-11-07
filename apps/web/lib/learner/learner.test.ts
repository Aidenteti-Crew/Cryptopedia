import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { hubSchema, type HubData } from '@/lib/cryptopedia-hub'
import { PRIMARY_NAV } from '@/lib/cryptopedia-taxonomy'

import { computeRoute, prerequisitesOf } from './route'
import {
  LEARNER_STORAGE_KEY,
  createLocalLearnerStore,
  emptyLearnerState,
  parseLearnerState,
  readCompletedCases,
  type LearnerState,
} from './store'
import {
  EXPERIENCES,
  GOAL_FIT,
  ROLE_IDS,
  SPECIAL_GOALS,
  TRACKS,
  experienceLabel,
  knownFromExperience,
} from './tracks'

const hub = hubSchema.parse(
  JSON.parse(readFileSync(new URL('../../public/cryptopedia/hub.json', import.meta.url), 'utf8'))
)
const ids = new Set([
  ...hub.concepts.map((item) => item.id),
  ...hub.cases.map((item) => item.id),
  ...hub.skills.map((item) => item.id),
])

const learner = (patch: Partial<LearnerState> = {}): LearnerState => ({
  ...emptyLearnerState(),
  ...patch,
})

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  }
}

test('every track, experience and goal points at ids that exist in hub.json', () => {
  for (const role of ROLE_IDS) {
    for (const id of TRACKS[role].concepts) assert.ok(ids.has(id), `${role}: ${id}`)
    for (const extra of TRACKS[role].extras) {
      if (extra.kind === 'screen') assert.ok(PRIMARY_NAV.some((item) => item.id === extra.id))
      else assert.ok(ids.has(extra.id), `${role}: ${extra.id}`)
    }
  }
  for (const [key, experience] of Object.entries(EXPERIENCES))
    for (const id of experience.known) assert.ok(ids.has(id), `${key}: ${id}`)
  for (const id of Object.keys(GOAL_FIT)) assert.ok(ids.has(id), id)
  for (const [key, goal] of Object.entries(SPECIAL_GOALS))
    for (const id of [...goal.concepts, ...goal.extras.map((extra) => extra.id)])
      assert.ok(ids.has(id), `${key}: ${id}`)
})

test('the agent goal goes through one concept and then the ecosystem skills', () => {
  const route = computeRoute(
    hub,
    { mode: 'goal', role: 'pm', goal: 'agent-skills', chainId: 'avalanche' },
    learner()
  )
  const kinds = route.steps.map((step) => step.kind)
  assert.deepEqual([...new Set(kinds)], ['concept', 'skill'])
  assert.equal(route.steps.filter((step) => step.kind === 'skill').length, hub.skills.length)
  assert.equal(route.name, SPECIAL_GOALS['agent-skills'].title)
})

test("having used the chosen chain marks that chain's concepts only", () => {
  assert.equal(experienceLabel('used-chain', 'Avalanche'), 'Avalanche 체인을 직접 써봤어요')
  assert.deepEqual(
    [...knownFromExperience(['used-chain'], 'avalanche')],
    ['concept-primary-network', 'concept-c-chain']
  )
  assert.equal(knownFromExperience(['used-chain'], 'injective').size, 0)
})

test('prerequisites are pulled in and always come before the concept that needs them', () => {
  const route = computeRoute(
    hub,
    { mode: 'track', role: 'newbie', goal: null, chainId: 'avalanche' },
    learner()
  )
  const order = route.steps.filter((step) => step.kind === 'concept').map((step) => step.id)
  // C-Chain 은 트랙에 있지만 Primary Network 는 없다 → 선행이라 자동으로 들어간다
  assert.ok(order.includes('concept-primary-network'))
  assert.deepEqual(route.added, ['concept-primary-network'])
  const byId = new Map(hub.concepts.map((concept) => [concept.id, concept]))
  order.forEach((id, index) => {
    for (const pre of prerequisitesOf(byId.get(id)!))
      assert.ok(order.indexOf(pre) < index, `${pre} should come before ${id}`)
  })
  assert.equal(route.start?.id, 'concept-consensus')
})

test('a goal route takes its concepts from the case steps and ends with the case and its skills', () => {
  const route = computeRoute(
    hub,
    { mode: 'goal', role: 'junior', goal: 'case-first-contract', chainId: 'avalanche' },
    learner()
  )
  const study = hub.cases.find((item) => item.id === 'case-first-contract')!
  for (const id of study.steps.flatMap((step) => step.conceptIds))
    assert.ok(
      route.steps.some((step) => step.id === id),
      id
    )
  const extras = route.steps.filter((step) => step.kind !== 'concept').map((step) => step.id)
  assert.deepEqual(extras, ['case-first-contract', ...study.skillIds])
  assert.equal(route.name, study.title)
})

test('experience marks concepts as known and the start skips them', () => {
  const route = computeRoute(
    hub,
    { mode: 'goal', role: 'junior', goal: 'case-first-contract', chainId: 'avalanche' },
    learner({ profile: { role: 'junior', experience: ['defi'] } })
  )
  const status = new Map(route.steps.map((step) => [step.id, step.status]))
  assert.equal(status.get('concept-wallet'), 'known')
  assert.equal(status.get('concept-gas'), 'known')
  assert.equal(route.start?.id, 'concept-evm')
  assert.equal(route.doneCount, 2)
})

test('own progress wins over experience, including undoing a known concept', () => {
  const at = '2026-11-04T00:00:00Z'
  const route = computeRoute(
    hub,
    { mode: 'goal', role: 'junior', goal: 'case-first-contract', chainId: 'avalanche' },
    learner({
      profile: { role: 'junior', experience: ['defi'] },
      progress: {
        'concept-evm': { status: 'done', at },
        'concept-wallet': { status: 'todo', at },
      },
    })
  )
  const status = new Map(route.steps.map((step) => [step.id, step.status]))
  assert.equal(status.get('concept-evm'), 'done')
  assert.equal(status.get('concept-wallet'), null)
  assert.notEqual(route.start?.id, 'concept-evm')
})

test('ids missing from the hub are dropped without errors', () => {
  const smallHub: HubData = {
    ...hub,
    concepts: hub.concepts.filter((concept) => concept.scope.kind !== 'CHAIN'),
    cases: [],
  }
  const route = computeRoute(
    smallHub,
    { mode: 'track', role: 'senior', goal: null, chainId: 'avalanche' },
    learner()
  )
  assert.ok(route.steps.every((step) => step.kind !== 'case'))
  assert.ok(route.steps.every((step) => !step.id.startsWith('concept-p-chain')))
  const missingGoal = computeRoute(
    hub,
    { mode: 'goal', role: 'bd', goal: 'case-nope', chainId: 'avalanche' },
    learner()
  )
  assert.equal(missingGoal.steps.length, 0)
  assert.equal(missingGoal.start, null)
})

test('a finished case comes from the existing case study record', () => {
  const study = hub.cases[0]
  const all = study.checks.map((_, index) => index)
  const storage = memoryStorage({
    [`cryptopedia-study:${study.id}`]: JSON.stringify(all),
    [`cryptopedia-study:${hub.cases[1].id}`]: JSON.stringify([0]),
  })
  const done = readCompletedCases(hub, storage)
  assert.deepEqual([...done], [study.id])
  const route = computeRoute(
    hub,
    { mode: 'goal', role: 'junior', goal: study.id, chainId: 'avalanche' },
    learner(),
    done
  )
  assert.equal(route.steps.find((step) => step.id === study.id)?.status, 'done')
})

test('the local store survives empty, broken and foreign records', async () => {
  const storage = memoryStorage()
  const store = createLocalLearnerStore(storage)
  assert.deepEqual(await store.load(), emptyLearnerState())

  storage.setItem(LEARNER_STORAGE_KEY, '{not json')
  assert.deepEqual(await store.load(), emptyLearnerState())
  assert.deepEqual(parseLearnerState({ version: 2 }), emptyLearnerState())

  const state = learner({
    profile: { role: 'bd', experience: ['wallet'] },
    paths: [
      {
        id: 'path-1',
        name: '생태계 지형 파악',
        mode: 'track',
        role: 'bd',
        chainId: 'avalanche',
        goal: null,
        createdAt: '2026-11-04T00:00:00Z',
      },
    ],
    activePathId: 'path-1',
  })
  assert.equal(await store.save(state), true)
  assert.deepEqual(await store.load(), state)

  const blocked = createLocalLearnerStore({
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceeded')
    },
  })
  assert.equal(await blocked.save(state), false)
  assert.equal(await createLocalLearnerStore(null).save(state), false)
})
