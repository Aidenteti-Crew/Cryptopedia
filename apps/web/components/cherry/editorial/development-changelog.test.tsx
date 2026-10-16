import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DevelopmentChangelog } from './development-changelog'

test('changelog groups by Korean publication month and keeps title, stage, version and source', () => {
  const html = renderToStaticMarkup(
    <DevelopmentChangelog
      entries={[
        {
          id: 'release',
          title: 'Coreth release',
          summary: 'DETAIL_ONLY_SUMMARY',
          kind: 'UPDATE',
          subKind: 'RELEASE',
          version: 'v1.0.0',
          prerelease: false,
          publishedAt: '2026-09-30T16:00:00Z',
          sourceUrl: 'https://github.com/ava-labs/coreth/releases/tag/v1.0.0',
        },
        {
          id: 'article',
          title: 'Technical article',
          summary: 'Other detail',
          kind: 'UPDATE',
          subKind: 'BLOG',
          publishedAt: '2026-09-10T00:00:00Z',
        },
      ]}
      onOpen={() => undefined}
      onProductSelect={() => undefined}
    />
  )
  assert.match(html, /2026년 10월/)
  assert.match(html, /2026년 9월/)
  assert.match(html, />10.01<\/time>/)
  assert.match(html, /정식 릴리스/)
  assert.match(html, /v1.0.0/)
  assert.match(html, /Coreth 업데이트만 보기/)
  assert.match(html, /href="https:\/\/github.com\/ava-labs\/coreth\/releases\/tag\/v1.0.0"/)
  assert.doesNotMatch(html, /DETAIL_ONLY_SUMMARY/)
  assert.ok(html.indexOf('Coreth release') < html.indexOf('Technical article'))
})
