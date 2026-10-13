import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ecosystemPageSchema } from '@/lib/cryptopedia-types'
import { EcosystemPage } from './ecosystem-page'
import { HeroCarousel, type OverviewHeroItem } from '../nd-overview-page'

const data = ecosystemPageSchema.parse(
  JSON.parse(
    readFileSync(new URL('../../../public/cryptopedia/ecosystem.json', import.meta.url), 'utf8')
  )
)
const noop = () => undefined

test('home starts with the original carousel and presents both audience paths', () => {
  const html = renderToStaticMarkup(
    <EcosystemPage data={data} onOpenScreen={noop} onOpenLatest={noop} />
  )
  assert.ok(html.indexOf('생태계 최신 소식') < html.indexOf('<h1'))
  assert.match(html, /이전 소식/)
  assert.match(html, /4번째 소식 보기/)
  assert.match(html, /예시 소식/)
  assert.match(html, /사람이 공부하기/)
  assert.match(html, /케이스별 실습으로/)
  assert.match(html, /에이전트에게 전달하기/)
  assert.match(html, /스킬 라이브러리로/)
  assert.match(html, /Technology Built for Business/)
  assert.match(html, /공식 홈페이지/)
  assert.match(html, /href="https:\/\/www.avalanche.com\/"/)
  assert.match(html, /Buzz Distribution/)
  assert.match(html, /4개 소식/)
  assert.doesNotMatch(html, /\bDEMO\b/)
  assert.doesNotMatch(html, /Model Updates|PAPER_BENCHMARK/)
})

test('empty news shows an empty state without falling back to unrelated AI data', () => {
  const html = renderToStaticMarkup(
    <EcosystemPage data={{ ...data, latest: [] }} onOpenScreen={noop} onOpenLatest={noop} />
  )
  assert.match(html, /새 소식이 등록되면/)
  assert.match(html, /집계할 소식이 없습니다/)
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
