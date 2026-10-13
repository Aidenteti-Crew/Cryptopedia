import assert from 'node:assert/strict'
import test from 'node:test'
import { getNewsDistribution, sortHomeNews } from './cryptopedia-home'
import type { ContentEntry } from './cryptopedia-types'

const entry = (
  id: string,
  kind: ContentEntry['kind'],
  fields: Partial<ContentEntry> = {}
): ContentEntry => ({ id, kind, title: id, summary: '', ...fields })

test('news distribution counts unique news only and combines development categories', () => {
  const data = [
    entry('project', 'PROJECT'),
    entry('macro', 'MACRO'),
    entry('macro', 'MACRO'),
    entry('event', 'EVENT'),
    entry('dev', 'DEV'),
    entry('update', 'UPDATE'),
    entry('concept', 'GLOSSARY'),
  ]
  assert.deepEqual(getNewsDistribution(data), [
    { page: 'projects', articleCount: 1, percent: 20 },
    { page: 'macro', articleCount: 1, percent: 20 },
    { page: 'events', articleCount: 1, percent: 20 },
    { page: 'updates', articleCount: 2, percent: 40 },
  ])
  assert.deepEqual(getNewsDistribution([]), [])
})

test('dated news sorts by actual time and undated previews follow their editorial order', () => {
  const data = [
    entry('preview-two', 'EVENT', { order: 2 }),
    entry('older', 'MACRO', { publishedAt: '2026-10-13T12:00:00Z' }),
    entry('preview-one', 'PROJECT', { order: 1 }),
    entry('newer', 'DEV', { publishedAt: '2026-10-14T10:00:00+09:00' }),
  ]
  assert.deepEqual(
    sortHomeNews(data).map((item) => item.id),
    ['newer', 'older', 'preview-one', 'preview-two']
  )
  assert.equal(data[0].id, 'preview-two')
})
