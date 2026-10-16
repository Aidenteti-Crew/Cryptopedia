import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DevelopmentUpdatesPage } from './development-updates-page'
import { DevelopmentUpdateDetail } from './development-update-detail'
import type { ContentEntry } from '@/lib/cryptopedia-types'

const latest: ContentEntry = {
  id: 'latest',
  kind: 'UPDATE',
  subKind: 'BLOG',
  title: '최신 기술 설명',
  summary: 'LATEST_DETAIL',
  publishedAt: '2026-09-08T10:00:00Z',
  sourceUrl: 'https://build.avax.network/blog/example',
  sourceName: '공식 기술 블로그',
  activations: [
    {
      network: 'MAINNET',
      at: '2026-09-22T15:00:00Z',
      evidence: 'Verified activation',
      sourceUrl: 'https://build.avax.network/blog/example',
    },
  ],
}

test('initial reading layout chooses the latest publication without opening a modal', () => {
  const html = renderToStaticMarkup(
    <DevelopmentUpdatesPage
      stateKey="reading-initial"
      entries={[
        {
          id: 'old',
          kind: 'UPDATE',
          subKind: 'RELEASE',
          title: '이전 릴리스',
          summary: 'OLD_DETAIL',
          publishedAt: '2025-11-01T00:00:00Z',
        },
        latest,
      ]}
    />
  )
  const detail = html.match(
    /<aside[^>]*aria-label="선택한 개발 업데이트 상세"[\s\S]*?<\/aside>/
  )?.[0]
  assert.ok(detail)
  assert.match(detail, /LATEST_DETAIL/)
  assert.doesNotMatch(detail, /OLD_DETAIL/)
  assert.doesNotMatch(html, /role="dialog"/)
})

test('an empty result has no automatic detail pane or modal', () => {
  const html = renderToStaticMarkup(
    <DevelopmentUpdatesPage stateKey="reading-empty" entries={[]} />
  )
  assert.doesNotMatch(html, /<aside|role="dialog"/)
  assert.match(html, /아직 수집된 개발 업데이트가 없습니다/)
})

test('inline detail preserves the original source and separately labeled KST and UTC activation', () => {
  const html = renderToStaticMarkup(
    <DevelopmentUpdateDetail
      inline
      entry={latest}
      onClose={() => undefined}
      returnFocus={{ current: null }}
    />
  )
  assert.match(html, /LATEST_DETAIL/)
  assert.match(html, /2026\. 09\. 23\. 00:00 KST/)
  assert.match(html, /2026\. 09\. 22\. 15:00 UTC/)
  assert.match(html, /href="https:\/\/build.avax.network\/blog\/example"/)
  assert.match(html, /네트워크 적용 일정/)
})
