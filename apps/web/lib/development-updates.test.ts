import assert from 'node:assert/strict'
import test from 'node:test'
import type { ContentEntry } from './cryptopedia-types'
import { getReleaseProducts, selectReleaseHistory, isReleaseCandidate } from './development-updates'

const entry=(id:string,overrides:Partial<ContentEntry>={}):ContentEntry=>({
  id,title:id,summary:'Protocol notes',kind:'UPDATE',subKind:'RELEASE',
  sourceName:'Coreth Releases',sourceUrl:`https://github.com/ava-labs/coreth/releases/tag/${id}`,
  publishedAt:'2026-10-10T00:00:00Z',version:id,...overrides,
})

test('software histories group releases by repository without adding technical articles',()=>{
  const products=getReleaseProducts([
    entry('v1.0.0'),entry('v1.1.0-rc.1'),
    entry('v2.0.0',{sourceName:'Subnet-EVM Releases',sourceUrl:'https://github.com/ava-labs/subnet-evm/releases/tag/v2.0.0'}),
    entry('article',{subKind:'BLOG',sourceUrl:'https://build.avax.network/blog/example'}),
  ])
  assert.deepEqual(products.map((product)=>[product.name,product.entries.length]),[['Coreth',2],['Subnet-EVM',1]])
})

test('candidate toggle, shared query and date range apply together within one product',()=>{
  const product=getReleaseProducts([
    entry('v1.0.0',{publishedAt:'2026-09-10T00:00:00Z'}),
    entry('v1.1.0-rc.1',{publishedAt:'2026-10-10T00:00:00Z'}),
    entry('v1.1.0',{publishedAt:'2026-10-12T00:00:00Z'}),
  ])[0]
  const options={query:'v1.1',from:'2026-10-01',to:'2026-10-31',sort:'latest' as const,includeCandidates:true}
  assert.deepEqual(selectReleaseHistory(product.entries,options).map((item)=>item.id),['v1.1.0','v1.1.0-rc.1'])
  assert.deepEqual(selectReleaseHistory(product.entries,{...options,includeCandidates:false}).map((item)=>item.id),['v1.1.0'])
  assert.deepEqual(selectReleaseHistory(product.entries,{...options,sort:'oldest'}).map((item)=>item.id),['v1.1.0-rc.1','v1.1.0'])
})

test('candidate recognition distinguishes release candidates from ordinary release tags',()=>{
  assert.equal(isReleaseCandidate(entry('v0.16.0-rc.0')),true)
  assert.equal(isReleaseCandidate(entry('v1.0.0-beta.2')),true)
  assert.equal(isReleaseCandidate(entry('v0.8.1-db-metrics-fix')),false)
  assert.equal(isReleaseCandidate(entry('v1.0.0')),false)
})
