import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ecosystemPageSchema } from '@/lib/cryptopedia-types'
import { EcosystemHomeV2 } from './ecosystem-home-v2'

const data = ecosystemPageSchema.parse(
  JSON.parse(
    readFileSync(new URL('../../../public/cryptopedia/ecosystem.json', import.meta.url), 'utf8')
  )
)
const noop = () => undefined

test('about shows build paths, pulse and learning list after the intro moves to ecosystem home', () => {
  const html = renderToStaticMarkup(
    <EcosystemHomeV2 data={data} onOpenScreen={noop} onOpenLatest={noop} />
  )
  const order = [
    'Avalanche에서 만들 수 있는 것',
    '지금 생태계에서는',
    '학습 시작하기',
  ].map((marker) => html.indexOf(marker))
  assert.ok(order.every((index) => index >= 0), 'every section renders')
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sections keep the specified order')

  assert.doesNotMatch(html, /하나의 생태계, 다양한 블록체인의 가능성\.|나는 어떤 Avalanche 빌더일까\?|4 QUESTIONS · ABOUT 1 MINUTE/)
  assert.match(html, /EVM 앱 개발/)
  assert.match(html, /나만의 Avalanche L1/)
  assert.match(html, /체인 기초/)
  assert.match(html, /빌더 라이브러리/)
  assert.match(html, /아카데미/)
  // the previous home sections are gone
  assert.doesNotMatch(html, /Buzz Distribution|사람이 공부하기|최신 소식 슬라이드/)
  assert.doesNotMatch(html, /\bDEMO\b/)
})

test('build paths are concise and only claim what the site really has', () => {
  const html = renderToStaticMarkup(
    <EcosystemHomeV2 data={data} onOpenScreen={noop} onOpenLatest={noop} />
  )
  const build = html.slice(html.indexOf('Avalanche에서 만들 수 있는 것'), html.indexOf('지금 생태계에서는'))
  // EVM card: reference items for common EVM tools, no C-Chain / process claims
  assert.match(build, /Solidity·Foundry·viem/)
  assert.doesNotMatch(build, /C-Chain|과정을 다룹니다/)
  // L1 / Interchain: honest that dedicated material is not ready, once per card
  assert.equal((build.match(/전용 학습 자료는 준비 중이며/g) ?? []).length, 2)
  // each card ends in links to screens that exist
  assert.match(build, /빌더 라이브러리 <svg/)
  assert.equal((build.match(/공식 문서 <svg/g) ?? []).length, 2)
  // no removed bullets, no new documents, no promises of exercises
  assert.doesNotMatch(build, /관련 아카데미 및 공식 문서로 연결|관련 공식 문서 및 학습 콘텐츠로 연결|준비 중 · |L1 입문|Interchain 입문|실습을 제공/)
})

test('ecosystem pulse shows only collected entries, at most two per category', () => {
  const entry = (id: string, kind: string, title: string) => ({
    id,
    title,
    summary: '',
    kind,
    sourceName: 'Source',
    publishedAt: '2026-10-01T00:00:00Z',
  })
  const html = renderToStaticMarkup(
    <EcosystemHomeV2
      data={ecosystemPageSchema.parse({
        ...data,
        latest: [
          entry('m1', 'MACRO', 'Macro one'),
          entry('m2', 'MACRO', 'Macro two'),
          entry('m3', 'MACRO', 'Macro three'),
          entry('d1', 'DEV', 'Dev one'),
        ],
      })}
      onOpenScreen={noop}
      onOpenLatest={noop}
    />
  )
  assert.match(html, /Macro one/)
  assert.match(html, /Macro two/)
  assert.doesNotMatch(html, /Macro three/)
  assert.match(html, /Dev one/)
  // the events column has no entries: a short note, nothing invented
  assert.match(html, /새 소식 없음/)
  assert.doesNotMatch(html, /연결할 수 없습니다|연결되면/)
})

test('empty or unreachable news shows one concise empty state instead of three repeats', () => {
  const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length

  const empty = renderToStaticMarkup(
    <EcosystemHomeV2 data={{ ...data, latest: [] }} onOpenScreen={noop} onOpenLatest={noop} />
  )
  assert.equal(count(empty, /아직 수집된 소식이 없습니다/g), 1)
  assert.doesNotMatch(empty, /소식 피드에 연결/)
  assert.doesNotMatch(empty, /새 소식 없음/)

  const down = renderToStaticMarkup(
    <EcosystemHomeV2
      data={{ ...data, latest: [] }}
      feed="unavailable"
      onOpenScreen={noop}
      onOpenLatest={noop}
    />
  )
  assert.equal(count(down, /소식 피드에 연결되면/g), 1)
  assert.doesNotMatch(down, /MODEL_UPDATES|Model Updates/)
  // the three category shortcuts are still there
  assert.match(down, /매크로 소식 →/)
  assert.match(down, /행사·이벤트 →/)
  assert.match(down, /개발 업데이트 →/)
})

test('a chain without registered home content still renders a minimal home', () => {
  const html = renderToStaticMarkup(
    <EcosystemHomeV2 data={data} chainId="unregistered" onOpenScreen={noop} onOpenLatest={noop} />
  )
  assert.match(html, /<h1/)
  assert.match(html, /지금 생태계에서는/)
  assert.doesNotMatch(html, /FIND YOUR BUILDER TYPE|WHAT CAN YOU BUILD|START LEARNING/)
})
