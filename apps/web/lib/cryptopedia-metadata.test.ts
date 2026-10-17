import assert from 'node:assert/strict'
import test from 'node:test'

import { getEditorialDetailMetadata, MENU_PAGE_TITLES } from './cryptopedia-metadata'
import { CHAPTER_NAV } from './cryptopedia-taxonomy'

test('every LEARN menu page has an English tab title', () => {
  for (const child of CHAPTER_NAV.flatMap((chapter) => chapter.children ?? [])) {
    assert.ok(MENU_PAGE_TITLES[child.id], `missing English title: ${child.id}`)
    assert.equal(getEditorialDetailMetadata(child.id).title, MENU_PAGE_TITLES[child.id])
    assert.match(MENU_PAGE_TITLES[child.id], /^[A-Za-z &]+$/)
  }
})
