import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'


import { EventBookmarkButton } from './event-bookmark-button'

const noop = () => {}

test('an unsaved heart offers to add the event and is not pressed', () => {
  const html = renderToStaticMarkup(<EventBookmarkButton saved={false} onToggle={noop} />)
  assert.match(html, /aria-pressed="false"/)
  assert.match(html, /aria-label="관심 행사에 추가"/)
  assert.match(html, /fill="none"/)
})

test('a saved heart is pressed, filled, and offers to remove the event', () => {
  const html = renderToStaticMarkup(<EventBookmarkButton saved onToggle={noop} />)
  assert.match(html, /aria-pressed="true"/)
  assert.match(html, /aria-label="관심 행사에서 빼기"/)
  assert.match(html, /fill="currentColor"/)
  assert.match(html, /text-\[var\(--editorial-accent\)\]/)
})

test('the heart is a button of at least 40px that does not submit anything', () => {
  const html = renderToStaticMarkup(<EventBookmarkButton saved={false} onToggle={noop} />)
  assert.match(html, /type="button"/)
  assert.match(html, /\bh-10\b/)
  assert.match(html, /\bw-10\b/)
})
