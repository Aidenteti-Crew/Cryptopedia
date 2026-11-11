import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ContentEntry } from '@/lib/cryptopedia-types'
import { stageBadge } from '@/lib/protocol-stage'

import { UpdateBadges } from './development-update-row'
import { ProtocolStageSection } from './protocol-stage-section'

type Stage = NonNullable<ContentEntry['protocolStage']>
const stage = (overrides: Partial<Stage>): Stage => ({
  stage: 'ACTIVATED',
  needsCheck: false,
  evidence: 'Status: Activated',
  sourceUrl: 'https://github.com/avalanche-foundation/ACPs/blob/abc/ACPs/267-x/README.md',
  proposalCreatedAt: '2026-02-10T18:03:33Z',
  proposalUpdatedAt: '2026-11-04T17:52:24Z',
  includedIn: { name: 'v1.15.0', url: 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0' },
  ...overrides,
})

test('each stage has its own word, and a shipped proposal reads 제안 · 확인 중', () => {
  assert.deepEqual(['PROPOSED', 'ACCEPTED', 'ACTIVATED', 'STALE'].map((s) => stageBadge(stage({ stage: s as Stage['stage'] })).label), [
    '제안', '확정', '적용', '중단',
  ])
  assert.equal(stageBadge(stage({ stage: 'PROPOSED', needsCheck: true })).label, '제안 · 확인 중')
})

test('the list shows ACP and the stage badge instead of a fixed "ACP 제안"', () => {
  const entry = { id: 'a', title: 'ACP-267', summary: '', kind: 'UPDATE', subKind: 'ACP', protocolStage: stage({}) } as ContentEntry
  const html = renderToStaticMarkup(<UpdateBadges entry={entry} />)
  assert.match(html, />ACP</)
  assert.match(html, />적용</)
  assert.doesNotMatch(html, /ACP 제안/)
})

test('지금 상태 shows document status, the release that shipped it, and the document dates', () => {
  const html = renderToStaticMarkup(<ProtocolStageSection stage={stage({})} />)
  assert.match(html, />지금 상태</)
  assert.match(html, /적용<span[^>]*>Status: Activated/)
  assert.match(html, /v1\.15\.0 릴리스 노트가 이 제안을 포함했어요/)
  assert.match(html, /href="https:\/\/github\.com\/ava-labs\/avalanchego\/releases\/tag\/v1\.15\.0"/)
  assert.match(html, /문서 첫 기록 2026\.02\.11 · 마지막 수정 2026\.11\.05/)
  assert.doesNotMatch(html, /확인 중이에요/)
})

test('a proposal shipped while its document still says Proposed is marked as being checked', () => {
  const html = renderToStaticMarkup(<ProtocolStageSection stage={stage({ stage: 'PROPOSED', needsCheck: true, evidence: 'Status: Proposed' })} />)
  assert.match(html, /문서 상태와 달라서 확인 중이에요/)
})

test('without a release record it says none was found yet', () => {
  const html = renderToStaticMarkup(<ProtocolStageSection stage={stage({ stage: 'PROPOSED', includedIn: null })} />)
  assert.match(html, /아직 이 제안을 포함한 릴리스를 찾지 못했어요/)
})
