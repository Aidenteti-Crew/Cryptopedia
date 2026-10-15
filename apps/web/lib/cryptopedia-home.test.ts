import assert from 'node:assert/strict'
import test from 'node:test'
import { getNewsDistribution, getProjectHeatmapItems, sortHomeNews } from './cryptopedia-home'
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

test('project heatmap preserves project totals while grouping small categories', () => {
  const items = getProjectHeatmapItems({
    categories: [
      { name: 'Wallets', count: 3 },
      { name: 'DeFi', count: 5 },
      { name: 'Payments', count: 2 },
    ],
    total: 10,
  }, 2)
  assert.deepEqual(items, [
    { name: 'DeFi', category: 'DeFi', count: 5, percent: 50 },
    { name: 'Wallets', category: 'Wallets', count: 3, percent: 30 },
    { name: '그 외 1개 분야', category: null, count: 2, percent: 20 },
  ])
  assert.equal(items.reduce((sum, item) => sum + item.count, 0), 10)
})
