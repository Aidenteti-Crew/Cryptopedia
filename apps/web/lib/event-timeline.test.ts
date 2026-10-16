import assert from 'node:assert/strict'
import test from 'node:test'
import { groupTimelineEvents } from './event-timeline'

test('keeps months on both sides of the target and inserts an empty selected date',()=>{
  const items=[{id:'old',startsAt:'2026-09-10T00:00:00Z',endsAt:null},{id:'next',startsAt:'2026-11-10T00:00:00Z',endsAt:null}]
  const groups=groupTimelineEvents(items,'2026-10-15')
  assert.deepEqual(groups.map(([date])=>date),['2026-09-10','2026-10-15','2026-11-10'])
  assert.equal(groups[1][1].length,0)
})

test('selected date includes ongoing events without losing their original timeline position',()=>{
  const item={id:'multi',startsAt:'2026-10-14T00:00:00Z',endsAt:'2026-10-17T00:00:00Z'}
  const groups=groupTimelineEvents([item],'2026-10-15')
  assert.deepEqual(groups.map(([date,items])=>[date,items.length]),[['2026-10-14',1],['2026-10-15',1]])
})
