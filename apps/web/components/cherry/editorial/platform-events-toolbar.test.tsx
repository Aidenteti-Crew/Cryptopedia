import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ChainOption } from '@/lib/platform-events'

import { PlatformEventsToolbar } from './platform-events-toolbar'

const noop = () => {}

const CHAINS: ChainOption[] = [
  { key: 'avalanche', label: 'Avalanche', count: 17 },
  { key: 'web3-kr', label: '국내 Web3', count: 5 },
]

const toolbar = (props: Partial<Parameters<typeof PlatformEventsToolbar>[0]> = {}) =>
  renderToStaticMarkup(
    <PlatformEventsToolbar
      view="calendar"
      onViewChange={noop}
      chains={CHAINS}
      selectedChains={[]}
      onToggleChain={noop}
      onClearChains={noop}
      savedOnly={false}
      savedCount={2}
      onToggleSavedOnly={noop}
      {...props}
    />
  )

test('the toolbar puts the view toggle first, then the chain chips, then the saved filter', () => {
  const html = toolbar()
  const at = (text: string) => html.indexOf(text)
  assert.ok(at('aria-label="보기 방식"') < at('aria-label="체인별 보기"'))
  assert.ok(at('aria-label="체인별 보기"') < at('aria-label="Avalanche 17건"'))
  assert.ok(at('aria-label="국내 Web3 5건"') < at('관심 행사만 (2)'))
})

test('with nothing selected 전체 is pressed and every chain chip is not', () => {
  const html = toolbar()
  assert.match(html, /aria-pressed="true"[^>]*>전체</)
  assert.match(html, /aria-pressed="false"[^>]*aria-label="Avalanche 17건"/)
  assert.match(html, /aria-pressed="false"[^>]*aria-label="국내 Web3 5건"/)
})

test('each chain gets one chip showing its label and count', () => {
  const html = toolbar()
  assert.match(html, /aria-label="Avalanche 17건"[^>]*>Avalanche<span[^>]*>17<\/span>/)
  assert.match(html, /aria-label="국내 Web3 5건"[^>]*>국내 Web3<span[^>]*>5<\/span>/)
  assert.equal((html.match(/aria-label="[^"]+ \d+건"/g) ?? []).length, CHAINS.length)
})

test('selected chips are pressed and 전체 is not', () => {
  const html = toolbar({ selectedChains: ['avalanche'] })
  assert.match(html, /aria-pressed="false"[^>]*>전체</)
  assert.match(html, /aria-pressed="true"[^>]*aria-label="Avalanche 17건"/)
  assert.match(html, /aria-pressed="false"[^>]*aria-label="국내 Web3 5건"/)
})

test('the saved filter shows how many events are saved and whether it is on', () => {
  assert.match(toolbar(), /aria-pressed="false"[^>]*>.*관심 행사만 \(2\)/)
  assert.match(toolbar({ savedOnly: true, savedCount: 0 }), /aria-pressed="true"[^>]*>.*관심 행사만 \(0\)/)
})
