import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { hubSchema } from '@/lib/cryptopedia-hub'
import { CaseStudyPage } from './case-study-page'
import { DevelopmentPatchNotes } from './development-patch-notes'
import { EcosystemLandscape } from './ecosystem-landscape'
import { HubDetailPage } from './hub-detail-page'
import { HubLibraryPage } from './hub-library-page'
import { InventoryCard } from '../kaas-workshop-panel'
import { asWorkshopItem } from '@/lib/cryptopedia-hub'

const data = hubSchema.parse(
  JSON.parse(readFileSync(new URL('../../../public/cryptopedia/hub.json', import.meta.url), 'utf8'))
)
const noop = () => undefined

test('shows ecosystem categories and both common and chain-specific tools', () => {
  const html = renderToStaticMarkup(<EcosystemLandscape data={data} onOpen={noop} />)
  assert.match(html, /지갑·계정/)
  assert.match(html, /viem/)
  assert.match(html, /EVM 공통/)
  assert.match(html, /Avalanche MCP/)
  assert.doesNotMatch(html, /TOP PICK/)
})

test('case pages connect ordered learning, agent bundles and explicit completion checks', () => {
  const html = renderToStaticMarkup(
    <CaseStudyPage study={data.cases[0]} data={data} onOpen={noop} />
  )
  assert.match(html, /학습하기/)
  assert.match(html, /에이전트용 묶음 받기/)
  assert.match(html, /STEP 01/)
  assert.match(html, /완료 체크리스트/)
  assert.match(html, /Foundry 테스트 레퍼런스/)
  assert.doesNotMatch(html, /installed|Install succeeded|구매하기/)
})

test('updates make demo status and impact connections explicit', () => {
  const html = renderToStaticMarkup(<DevelopmentPatchNotes data={data} onOpen={noop} />)
  assert.match(html, /실시간 수집 소식이 아닙니다/)
  assert.match(html, /조회 클라이언트 예제 변경 시나리오/)
  const detail = renderToStaticMarkup(
    <HubDetailPage id="change-client-example" data={data} onOpen={noop} />
  )
  assert.match(detail, /영향받는 지식·실습·스킬/)
  assert.match(detail, /공개 체인 데이터 조회/)
  assert.match(detail, /체인 데이터를 읽는 도구 만들기/)
})

test('skills expose complete instructions and graph reuses navigable concept relations', () => {
  const html = renderToStaticMarkup(
    <HubDetailPage id="skill-contract-review" data={data} onOpen={noop} />
  )
  assert.match(html, /필요한 입력/)
  assert.match(html, /기대 결과물/)
  assert.match(html, /스킬 파일 받기/)
  assert.match(html, /다운로드 파일 미리보기/)
  const graph = renderToStaticMarkup(<HubLibraryPage id="skill-graph" data={data} onOpen={noop} />)
  assert.match(graph, /개념 관계 지도/)
  assert.match(graph, /role="button"/)
  assert.match(graph, /이 개념을 활용하는 실습/)
})

test('the shared Workshop card keeps legacy drag behavior and supports editorial selection', () => {
  const item = asWorkshopItem(data.skills[0])
  const legacy = renderToStaticMarkup(<InventoryCard item={item} />)
  assert.match(legacy, /draggable="true"/)
  assert.match(legacy, /cursor-grab/)
  assert.match(legacy, /View source/)
  const editorial = renderToStaticMarkup(<InventoryCard item={item} appearance="editorial" selected onToggle={noop} onInspect={noop} />)
  assert.match(editorial, /draggable="false"/)
  assert.match(editorial, /type="checkbox"[^>]*checked=""/)
  assert.match(editorial, /지침 보기/)
})
