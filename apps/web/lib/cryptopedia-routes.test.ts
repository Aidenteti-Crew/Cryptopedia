import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { editorialViewFromPath, pathForEditorialView } from './cryptopedia-routes'
import type { EditorialView } from '@/components/cherry/editorial/editorial-app'

test('every editorial screen has a stable direct URL', () => {
  const paths = [
    '/knowledge',
    '/chains',
    '/projects',
    '/macro',
    '/knowledge/events',
    '/knowledge/events/archive',
    '/updates',
    '/builder-test',
    '/concepts',
    '/skills',
    '/academy',
  ]
  for (const path of paths) {
    const view = editorialViewFromPath(path)
    assert.ok(view, `missing route: ${path}`)
    assert.equal(pathForEditorialView(view), path)
  }
})

test('chapter and ecosystem details keep their parent in the URL', () => {
  const views: EditorialView[] = [
    { kind: 'article', id: 'chain-overview', parent: 'fundamentals' },
    { kind: 'article', id: 'practice', parent: 'academy' },
    { kind: 'article', id: 'skill-library', parent: 'builders' },
    { kind: 'article', id: 'institutional-collaboration', parent: 'macro' },
    { kind: 'article', id: 'avalanche-summit', parent: 'events' },
    { kind: 'article', id: 'overview', parent: 'ecosystem' },
    { kind: 'book', id: 'book-avalanche', parent: 'projects' },
  ]
  for (const view of views) {
    assert.deepEqual(editorialViewFromPath(pathForEditorialView(view)), view)
  }
  assert.equal(editorialViewFromPath('/unknown'), null)
  assert.equal(editorialViewFromPath('/unknown/something'), null)
  // LEARN 주소에 /chapters 를 붙이지 않는다 (옛 주소는 next.config 의 redirects 가 넘겨준다)
  assert.equal(editorialViewFromPath('/chapters/fundamentals/chain-overview'), null)
  assert.equal(pathForEditorialView({ kind: 'article', id: 'chain-overview', parent: 'fundamentals' }), '/concepts/chain-overview')
  // 예전 /ecosystem/... 주소는 더 이상 쓰지 않는다
  assert.equal(editorialViewFromPath('/ecosystem/projects'), null)
})

test('/ is the platform entrance and the knowledge home lives at /knowledge', () => {
  // / 와 예전 /about(→ / redirect) 은 플랫폼 입구라 지식 화면이 아니다
  assert.equal(editorialViewFromPath('/'), null)
  assert.equal(editorialViewFromPath('/about'), null)
  assert.equal(pathForEditorialView({ kind: 'screen', id: 'ecosystem' }), '/knowledge')
  // 체인별 행사는 /knowledge/events 아래 — /events 는 플랫폼 행사 페이지
  assert.equal(pathForEditorialView({ kind: 'article', id: 'summit', parent: 'events' }), '/knowledge/events/summit')
  assert.equal(editorialViewFromPath('/events'), null)
  assert.equal(editorialViewFromPath('/events/summit'), null)
  assert.deepEqual(editorialViewFromPath('/knowledge/events/archive'), { kind: 'screen', id: 'event-archive' })
})

test('editorial URLs have individual Next.js route entry points', () => {
  // 생태계·LEARN 화면은 (ecosystem)·(learn) 라우트 그룹 폴더 안에 있다 — 폴더명은 주소에 나타나지 않는다
  const paths = [
    '/',
    '/knowledge',
    '/careers',
    '/events',
    '/chains',
    '/(ecosystem)/projects',
    '/(ecosystem)/macro',
    '/knowledge/events',
    '/knowledge/events/archive',
    '/knowledge/events/[id]',
    '/(ecosystem)/updates',
    '/(ecosystem)/builder-test',
    '/(learn)/concepts',
    '/(learn)/skills',
    '/(learn)/academy',
    '/(learn)/concepts/[id]',
    '/(learn)/skills/[id]',
    '/(learn)/academy/[id]',
    '/(ecosystem)/[section]/[id]',
    '/(ecosystem)/articles/[id]',
    '/(ecosystem)/projects/books/[id]',
  ]
  for (const path of paths) {
    const routeFile = fileURLToPath(
      new URL(`../app/(chainery)${path === '/' ? '' : path}/page.tsx`, import.meta.url)
    )
    assert.ok(existsSync(routeFile), `missing route file: ${path}`)
  }
})
