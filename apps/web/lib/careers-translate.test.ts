import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { careersSchema, type CareerJob } from './careers'
import { applyDetails, parseCareerDetail, textHash, type CareerDetails } from './careers-translate'

const fixture = careersSchema.parse(
  JSON.parse(readFileSync(new URL('./careers.fixture.json', import.meta.url), 'utf8'))
)
const job = (id: string) => fixture.items.find((item) => item.id === id) as CareerJob

const reply = (over: object = {}) =>
  JSON.stringify({
    summary: 'Rust 로 노드 클라이언트를 개발하는 역할',
    responsibilities: ['- 노드 클라이언트 개발.', '성능 개선'],
    requirements: ['Rust 3년 이상'],
    preferred: [],
    conditions: ['원격 근무'],
    korea: 'no',
    ...over,
  })

test('AI 응답 — 코드 블록 · 앞뒤 말이 있어도 JSON 만 읽고, 글머리표 · 마침표는 지운다', () => {
  const detail = parseCareerDetail('결과입니다\n```json\n' + reply() + '\n```')
  assert.ok(detail)
  assert.deepEqual(detail.responsibilities, ['노드 클라이언트 개발', '성능 개선'])
  assert.equal(detail.korea, 'no')
})

test('AI 응답 — 한국어가 없거나 형식이 틀리면 버린다 (다음에 다시)', () => {
  assert.equal(parseCareerDetail(reply({ summary: 'Build node clients' })), null)
  assert.equal(parseCareerDetail('not json'), null)
  assert.equal(parseCareerDetail(reply({ korea: 'maybe' }))?.korea, 'unclear')
})

test('본문이 같으면 같은 hash — 바뀐 공고만 다시 번역', () => {
  assert.equal(textHash('a'), textHash('a'))
  assert.notEqual(textHash('a'), textHash('b'))
})

test('한국어 정리를 목록에 붙인다 — 본문이 다른 나라 거주를 요구하면 지원 불가', () => {
  const meta = { hash: 'h', model: 'm', translatedAt: 't' }
  const base = { responsibilities: [], requirements: [], preferred: [], conditions: [], ...meta }
  const details: CareerDetails = {
    'sample-frontend-dapp': { ...base, summary: '디앱 프론트엔드 개발', korea: 'no' }, // 위치로는 yes
    'sample-smart-contract': { ...base, summary: '스마트 컨트랙트 개발', korea: 'yes' }, // 위치로는 unclear
  }
  const [frontend, contract, other] = applyDetails(
    [job('sample-frontend-dapp'), job('sample-smart-contract'), job('sample-backend-indexer')],
    details
  )
  assert.equal(frontend.summaryKo, '디앱 프론트엔드 개발')
  assert.equal(frontend.koreaEligible, 'no')
  assert.equal(contract.koreaEligible, 'yes')
  assert.equal(other.summaryKo, undefined)
})
