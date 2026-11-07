import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ecosystemPageSchema } from '@/lib/cryptopedia-types'
import { EcosystemPage } from './ecosystem-page'
import { HeroCarousel, type OverviewHeroItem } from '../nd-overview-page'
import type { EcosystemProjectsResponse } from '@/lib/cryptopedia-types'

const data = ecosystemPageSchema.parse(
  JSON.parse(
    readFileSync(new URL('../../../public/cryptopedia/ecosystem.json', import.meta.url), 'utf8')
  )
)
const noop = () => undefined
const projects: EcosystemProjectsResponse = {
  items: [],
  categories: [{ name: 'DeFi', count: 2 }, { name: 'Wallets', count: 1 }],
  total: 3,
  generatedAt: '2026-10-14T00:00:00Z',
}

test('home shows the original carousel without the builder survey', () => {
  const html = renderToStaticMarkup(
    <EcosystemPage
      data={data}
      chainLogoUrl="/cryptopedia/assets/chains/avalanche.svg"
      projects={projects}
      onOpenScreen={noop}
      onOpenLatest={noop}
    />
  )
  const title = html.slice(html.indexOf('<h1'), html.indexOf('</h1>'))
  assert.match(title, /Avalanche/)
  assert.ok(html.indexOf('<h1') < html.indexOf('생태계 최신 소식'))
  // 빌더 유형 설문은 홈에서 내렸다 (지식 섹션 첫 진입의 '내 경로 만들기'가 대신한다)
  assert.doesNotMatch(html, /inline-builder-test-title/)
  assert.doesNotMatch(html, /나는 어떤 Avalanche 빌더일까\?/)
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.match(html, /하나의 생태계, 다양한 블록체인의 가능성\./)
  assert.match(html, /EVM Compatible/)
  assert.match(html, /이전 소식/)
  assert.match(html, /4번째 소식 보기/)
  assert.doesNotMatch(html, /예시 소식/)
  // '어떻게 시작할까요?'는 뺐고, Ecosystem Heatmap 은 체인·프로젝트 페이지로 옮겼다
  assert.doesNotMatch(html, /어떻게 시작할까요\?/)
  assert.doesNotMatch(html, /Ecosystem Heatmap/)
  assert.match(html, /공식 홈페이지/)
  assert.match(html, /href="https:\/\/www.avalanche.com\/"/)
  assert.doesNotMatch(html, /\bDEMO\b/)
  assert.doesNotMatch(html, /Model Updates|PAPER_BENCHMARK/)
})

test('empty news shows an empty state without falling back to unrelated AI data', () => {
  const html = renderToStaticMarkup(
    <EcosystemPage data={{ ...data, latest: [] }} projects={projects} onOpenScreen={noop} onOpenLatest={noop} />
  )
  assert.match(html, /새 소식이 등록되면/)
  assert.doesNotMatch(html, /집계할 소식이 없습니다/)
  assert.doesNotMatch(html, /MODEL_UPDATES|Model Updates/)
})

test('the exported carousel preserves legacy slides and supports internal slide rendering', () => {
  const items: OverviewHeroItem[] = [
    {
      n: 'Example',
      d: 'Summary',
      i: 'example',
      s: null,
      v: '',
      u: 'https://example.com',
      vf: 0,
      topic: 'Tools',
      type: 'tool',
    },
  ]
  const legacy = renderToStaticMarkup(<HeroCarousel items={items} />)
  assert.match(legacy, /Pick of the week/)
  assert.match(legacy, /href="https:\/\/example.com"/)
  const custom = renderToStaticMarkup(
    <HeroCarousel items={items} renderSlide={(item) => <button type="button">{item.n}</button>} />
  )
  assert.match(custom, /<button type="button">Example<\/button>/)
  assert.doesNotMatch(custom, /href="https:\/\/example.com"/)
})
