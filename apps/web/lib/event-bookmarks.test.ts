import assert from 'node:assert/strict'
import test from 'node:test'

import { parseBookmarks, toggleBookmark, toggleStoredBookmark } from './event-bookmarks'

test('toggling adds an id at the end and removes it when it is already saved', () => {
  assert.deepEqual(toggleBookmark([], 'a'), ['a'])
  assert.deepEqual(toggleBookmark(['a'], 'b'), ['a', 'b'])
  assert.deepEqual(toggleBookmark(['a', 'b'], 'a'), ['b'])
})

test('toggling leaves the list it was given untouched', () => {
  const saved = ['a']
  toggleBookmark(saved, 'b')
  assert.deepEqual(saved, ['a'])
})

test('parsing reads a JSON list of ids and shrugs off anything else', () => {
  assert.deepEqual(parseBookmarks('["a","b"]'), ['a', 'b'])
  assert.deepEqual(parseBookmarks('["a","a","b"]'), ['a', 'b'])
  assert.deepEqual(parseBookmarks(null), [])
  assert.deepEqual(parseBookmarks(''), [])
  assert.deepEqual(parseBookmarks('{not json'), [])
  assert.deepEqual(parseBookmarks('{"a":1}'), [])
  assert.deepEqual(parseBookmarks('"a"'), [])
  assert.deepEqual(parseBookmarks('["a",1,null,"",{"x":1},["b"],"c"]'), ['a', 'c'])
})

test('saving writes the ids to the browser and keeps working when storage throws', () => {
  const store = new Map<string, string>()
  const working = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: working } })
  toggleStoredBookmark('a')
  toggleStoredBookmark('b')
  toggleStoredBookmark('a')
  assert.equal(store.get('chainery:event-bookmarks'), '["b"]')

  const blocked = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: blocked } })
  assert.doesNotThrow(() => toggleStoredBookmark('c'))
  assert.doesNotThrow(() => toggleStoredBookmark('c'))
  delete (globalThis as { window?: unknown }).window
})
