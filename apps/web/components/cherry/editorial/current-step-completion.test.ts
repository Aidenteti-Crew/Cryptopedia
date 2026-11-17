import assert from 'node:assert/strict'
import test from 'node:test'

import type { RouteStep } from '@/lib/learner/route'
import { isCompletableCurrentStep } from './current-step-completion'

const step = (kind: RouteStep['kind'], id: string, status: RouteStep['status'] = null): RouteStep => ({
  kind,
  id,
  title: id,
  summary: '',
  minutes: 5,
  status,
  target: false,
})

test('offers completion only on the current unfinished LIVE screen or skill detail', () => {
  assert.equal(isCompletableCurrentStep(step('screen', 'updates'), { kind: 'screen', id: 'updates' }, 'avalanche', 'avalanche'), true)
  assert.equal(isCompletableCurrentStep(step('skill', 'skill-wallet'), { kind: 'article', id: 'skill-wallet' }, 'avalanche', 'avalanche'), true)
  assert.equal(isCompletableCurrentStep(step('screen', 'updates'), { kind: 'screen', id: 'events' }, 'avalanche', 'avalanche'), false)
  assert.equal(isCompletableCurrentStep(step('screen', 'updates'), { kind: 'screen', id: 'updates' }, 'avalanche', 'ethereum'), false)
  assert.equal(isCompletableCurrentStep(step('screen', 'updates', 'done'), { kind: 'screen', id: 'updates' }, 'avalanche', 'avalanche'), false)
  assert.equal(isCompletableCurrentStep(step('concept', 'updates'), { kind: 'screen', id: 'updates' }, 'avalanche', 'avalanche'), false)
  assert.equal(isCompletableCurrentStep(step('case', 'case-one'), { kind: 'article', id: 'case-one' }, 'avalanche', 'avalanche'), false)
  assert.equal(isCompletableCurrentStep(null, { kind: 'screen', id: 'updates' }, 'avalanche', 'avalanche'), false)
})
