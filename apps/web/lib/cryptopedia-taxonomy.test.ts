import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CHAPTER_NAV,
  DEFAULT_SCREEN_ID,
  PRIMARY_NAV,
  resolveParentScreen,
} from './cryptopedia-taxonomy'

test('puts the ecosystem collection first', () => {
  assert.equal(DEFAULT_SCREEN_ID, 'ecosystem')
  assert.deepEqual(
    PRIMARY_NAV.map((item) => item.id),
    ['projects', 'macro', 'events', 'updates']
  )
})

test('includes dedicated chain selection and ecosystem screens', () => {
  assert.equal(resolveParentScreen('institutional-collaboration'), 'macro')
  assert.equal(resolveParentScreen('chain-overview'), 'fundamentals')
})

test('orders LEARN as shared concepts, then the people academy, then agent skills', () => {
  assert.deepEqual(
    CHAPTER_NAV.map((item) => item.id),
    ['fundamentals', 'academy', 'builders']
  )
  // 뱃지: 아카데미 = 사람용, 에이전트 스킬 = 에이전트용, 핵심 개념은 공통이라 없음
  assert.deepEqual(
    CHAPTER_NAV.map((item) => item.audience ?? null),
    [null, 'people', 'agents']
  )
  for (const chapter of CHAPTER_NAV) {
    assert.doesNotMatch(chapter.label, /^\d/)
  }
})

test('resolves article ids to their parent screens', () => {
  assert.equal(resolveParentScreen('chain-overview'), 'fundamentals')
  assert.equal(resolveParentScreen('fuji-update'), 'updates')
  assert.equal(resolveParentScreen('unknown-entry'), null)
})
