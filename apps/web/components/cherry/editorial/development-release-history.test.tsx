import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReleaseHistory } from './development-release-history'

test('release history puts version before article title and shows source notes and candidate badge', () => {
  const html = renderToStaticMarkup(
    <ReleaseHistory
      productName="Coreth"
      entries={[
        {
          id: 'release',
          title: 'Coreth improves validation',
          summary: 'Fixes validation logic',
          kind: 'UPDATE',
          subKind: 'RELEASE',
          version: 'v1.1.0-rc.1',
          publishedAt: '2026-10-10T00:00:00Z',
          sourceUrl: 'https://github.com/ava-labs/coreth/releases/tag/v1.1.0-rc.1',
        },
      ]}
    />
  )
  assert.match(html, /<h3[^>]*>v1.1.0-rc.1<\/h3>/)
  assert.match(html, /출시 후보/)
  assert.match(html, /GitHub 릴리스/)
  assert.match(html, /2026.10.10/)
  assert.ok(html.indexOf('v1.1.0-rc.1</h3>') < html.indexOf('Coreth improves validation'))
})

test('release timeline keeps publication order and distinguishes official stable, preview and unknown stages', () => {
  const make = (
    id: string,
    extra: Partial<import('@/lib/cryptopedia-types').ContentEntry> = {}
  ) => ({
    id,
    title: `Change ${id}`,
    summary: 'Summary',
    kind: 'UPDATE' as const,
    subKind: 'RELEASE',
    version: id,
    publishedAt: '2026-10-10T00:00:00Z',
    ...extra,
  })
  const html = renderToStaticMarkup(
    <ReleaseHistory
      productName="Coreth"
      entries={[
        make('v1.1.0', { prerelease: false }),
        make('v1.1.0-rc.1', { prerelease: true }),
        make('v1.0.0'),
      ]}
      onOpen={() => undefined}
    />
  )
  assert.match(html, /<ol[^>]*aria-label="Coreth 버전 공개 순서"/)
  assert.equal((html.match(/<li /g) ?? []).length, 3)
  assert.ok(
    html.indexOf('data-release-stage="stable"') < html.indexOf('data-release-stage="prerelease"')
  )
  assert.match(html, /data-release-stage="unknown"/)
  assert.match(html, /릴리스 단계 미확인/)
  assert.match(html, /<button[^>]*>[\s\S]*?<h3[^>]*>v1.1.0<\/h3>/)
})
