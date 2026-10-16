import assert from 'node:assert/strict'
import test from 'node:test'
import type { ContentEntry } from './cryptopedia-types'
import {
  DEFAULT_DEVELOPMENT_FILTERS as defaults,
  closestUpdateDay,
  deduplicateUpdates,
  majorUpdates,
  releaseStage,
  selectDevelopmentUpdates,
  updateProducts,
} from './development-discovery'

const make = (id: string, extra: Partial<ContentEntry> = {}): ContentEntry => ({
  id,
  kind: 'UPDATE',
  subKind: 'RELEASE',
  title: id,
  summary: 'notes',
  publishedAt: '2026-10-01T16:00:00Z',
  sourceUrl: `https://github.com/ava-labs/coreth/releases/tag/${id}`,
  version: id,
  ...extra,
})
test('release status uses official prerelease metadata and does not assume stable from semver', () => {
  assert.equal(releaseStage(make('v1.0.0')), 'unknown')
  assert.equal(releaseStage(make('v1.0.0-fuji', { prerelease: true })), 'prerelease')
  assert.equal(releaseStage(make('v1.0.0-rc.1', { prerelease: false })), 'stable')
})
test('products use the release repository, not other dependencies in the title', () => {
  assert.deepEqual(updateProducts(make('release', { title: 'Uses AvalancheGo v1' })), [
    { id: 'coreth', name: 'Coreth' },
  ])
  assert.deepEqual(
    updateProducts(
      make('article', {
        subKind: 'BLOG',
        sourceUrl: 'https://build.avax.network/blog/example',
        title: 'General protocol article',
      })
    ),
    []
  )
})
test('filters combine product, KST publication date, stage, network and search', () => {
  const a = make('v1.1.0', { prerelease: false, network: 'BOTH' })
  const b = make('v1.1.0-rc.1', { prerelease: true, network: 'OTHER' })
  assert.deepEqual(
    selectDevelopmentUpdates([a, b], {
      ...defaults,
      query: 'v1.1',
      product: 'coreth',
      from: '2026-10-02',
      to: '2026-10-02',
      stage: 'stable',
      network: 'FUJI',
    }).map((e) => e.id),
    [a.id]
  )
  assert.equal(selectDevelopmentUpdates([a, b], { ...defaults, to: '2026-10-01' }).length, 0)
  assert.equal(selectDevelopmentUpdates([a, b], { ...defaults, network: 'NA' }).length, 0)
  assert.equal(
    selectDevelopmentUpdates([make('missing', { network: null })], {
      ...defaults,
      network: 'UNKNOWN',
    }).length,
    1
  )
})
test('history ignores article kind, keeps product selection and filters its release stage', () => {
  const a = make('v1', { prerelease: true })
  assert.equal(
    selectDevelopmentUpdates(
      [a, make('blog', { subKind: 'BLOG' })],
      { ...defaults, kind: 'BLOG', product: 'coreth', stage: 'prerelease' },
      true
    ).length,
    1
  )
})
test('duplicate source URLs collapse while different articles about one upgrade remain', () => {
  const a = make('a', { upgradeName: 'Granite' })
  const b = make('b', { upgradeName: 'Granite' })
  assert.deepEqual(
    deduplicateUpdates([a, { ...a, id: 'copy', sourceUrl: `${a.sourceUrl}#changes` }, b]).map(
      (e) => e.id
    ),
    ['a', 'b']
  )
})
test('importance alone cannot feature an item and completed upgrade schedules expire', () => {
  const evidence = {
    kind: 'mandatory' as const,
    evidence: 'All mainnet nodes MUST update.',
    sourceUrl: 'https://github.com/ava-labs/coreth/releases/tag/v1',
  }
  const a = make('a', { importance: 5 })
  const b = make('b', {
    changeFlags: [evidence],
    activations: [
      {
        at: '2026-10-05T00:00:00Z',
        network: 'MAINNET',
        evidence: 'Activation schedule',
        sourceUrl: evidence.sourceUrl,
      },
    ],
  })
  const c = make('c', { changeFlags: [evidence] })
  assert.deepEqual(
    majorUpdates([a, b, c], Date.parse('2026-10-15T00:00:00Z')).map((e) => e.id),
    ['c']
  )
})
test('empty calendar dates resolve to a real publication date', () => {
  assert.equal(closestUpdateDay([make('a')], '2026-10-15'), '2026-10-02')
  assert.equal(closestUpdateDay([], '2026-10-15'), null)
})

test('checkbox filters match any option within a group and combine groups together', () => {
  const a=make('a',{prerelease:false,network:'MAINNET'})
  const b=make('b',{prerelease:true,network:'FUJI',sourceUrl:'https://github.com/ava-labs/subnet-evm/releases/tag/b'})
  const c=make('c',{prerelease:false,network:'OTHER'})
  const selected={...defaults,product:['coreth','subnet-evm'],stage:['stable','prerelease'],network:['MAINNET','FUJI']}
  assert.deepEqual(selectDevelopmentUpdates([a,b,c],selected).map((e)=>e.id),['a','b'])
  assert.deepEqual(selectDevelopmentUpdates([a,b,c],{...selected,stage:['stable']}).map((e)=>e.id),['a'])
  assert.equal(selectDevelopmentUpdates([a,b,c],{...defaults,product:[],network:[],stage:[],change:[]}).length,3)
})
