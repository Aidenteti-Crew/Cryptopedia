import assert from 'node:assert/strict'
import test from 'node:test'
import { getProjectHeatmapItems } from './cryptopedia-home'
import { getProjectCategoryPalette, projectCategoryStyle } from './project-category-colors'

test('a category keeps its shared tile and card colors when project counts reorder the heatmap', () => {
  const categories = [
    { name: 'Assets', count: 21 },
    { name: 'DeFi', count: 12 },
  ]
  const first = getProjectHeatmapItems({ categories, total: 33 })
  const second = getProjectHeatmapItems({
    categories: [...categories].reverse().map((c) => ({ ...c, count: c.name === 'DeFi' ? 30 : 3 })),
    total: 33,
  })
  assert.notEqual(first[0].category, second[0].category)
  for (const item of [...first, ...second]) {
    const { start, end } = getProjectCategoryPalette(item.category)
    assert.equal(
      projectCategoryStyle(item.category)[
        '--project-gradient' as keyof ReturnType<typeof projectCategoryStyle>
      ],
      `linear-gradient(105deg, ${start}, ${end})`
    )
  }
  assert.notDeepEqual(getProjectCategoryPalette('Assets'), getProjectCategoryPalette('DeFi'))
})

test('unclassified and unknown names use the neutral palette, including object property names', () => {
  for (const category of [null, undefined, 'New category', 'constructor', 'toString']) {
    assert.deepEqual(getProjectCategoryPalette(category), getProjectCategoryPalette(null))
  }
})

test('shared category gradient stops support readable small white labels', () => {
  const luminance = (hex: string) =>
    hex
      .slice(1)
      .match(/../g)!
      .map((s) => parseInt(s, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  for (const category of [
    'Assets',
    'DeFi',
    'Analytics & Data',
    'Crosschain Solutions',
    'RPC Endpoints',
    'Fiat On-Ramp',
    'Security Audits',
    'Oracles',
    null,
  ]) {
    const { start, end } = getProjectCategoryPalette(category)
    for (const color of [start, end])
      assert.ok(1.05 / (luminance(color) + 0.05) >= 4.5, `${category}: ${color}`)
  }
})
