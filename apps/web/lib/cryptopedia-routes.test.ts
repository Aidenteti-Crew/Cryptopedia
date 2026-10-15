import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { editorialViewFromPath, pathForEditorialView } from './cryptopedia-routes'
import type { EditorialView } from '@/components/cherry/editorial/editorial-app'

test('every editorial screen has a stable direct URL', () => {
  const paths = [
    '/',
    '/chains',
    '/ecosystem/projects',
    '/ecosystem/macro',
    '/ecosystem/events',
    '/ecosystem/events/archive',
    '/ecosystem/updates',
    '/ecosystem/builder-test',
    '/chapters/fundamentals',
    '/chapters/builders',
    '/chapters/academy',
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
    { kind: 'article', id: 'institutional-collaboration', parent: 'macro' },
    { kind: 'article', id: 'overview', parent: 'ecosystem' },
    { kind: 'book', id: 'book-avalanche', parent: 'projects' },
  ]
  for (const view of views) {
    assert.deepEqual(editorialViewFromPath(pathForEditorialView(view)), view)
  }
  assert.equal(editorialViewFromPath('/unknown'), null)
  assert.equal(editorialViewFromPath('/chapters/unknown/something'), null)
})

test('about has its own URL while the ecosystem menu resolves to the home', () => {
  assert.deepEqual(editorialViewFromPath('/about'), { kind: 'screen', id: 'ecosystem' })
  assert.equal(pathForEditorialView({ kind: 'screen', id: 'ecosystem' }), '/')
})

test('editorial URLs have individual Next.js route entry points', () => {
  const paths = [
    '/',
    '/about',
    '/chains',
    '/ecosystem/projects',
    '/ecosystem/macro',
    '/ecosystem/events',
    '/ecosystem/events/archive',
    '/ecosystem/updates',
    '/ecosystem/builder-test',
    '/chapters/fundamentals',
    '/chapters/builders',
    '/chapters/academy',
    '/chapters/[section]/[id]',
    '/ecosystem/[section]/[id]',
    '/ecosystem/articles/[id]',
    '/ecosystem/projects/books/[id]',
  ]
  for (const path of paths) {
    const routeFile = fileURLToPath(
      new URL(`../app/(cryptopedia)${path === '/' ? '' : path}/page.tsx`, import.meta.url)
    )
    assert.ok(existsSync(routeFile), `missing route file: ${path}`)
  }
})
