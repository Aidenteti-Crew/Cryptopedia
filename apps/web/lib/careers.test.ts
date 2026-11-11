import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CAREER_SKILLS,
  careersSchema,
  computeFit,
  emptyCareerProfile,
  formatMoney,
  formatSalary,
  isListableJob,
  loadCurrency,
  saveCurrency,
  isProfileReady,
  loadCareerProfile,
  nearestSalaryStep,
  saveCareerProfile,
  searchJobs,
  type CareerJob,
  type CareerProfile,
} from './careers'

const data = careersSchema.parse(
  JSON.parse(readFileSync(new URL('../public/cryptopedia/careers.json', import.meta.url), 'utf8'))
)
const byId = (id: string) => data.items.find((job) => job.id === id) as CareerJob

test('careers.json 은 계약에 맞고 id 가 겹치지 않는다', () => {
  assert.ok(data.items.length > 0)
  assert.equal(new Set(data.items.map((job) => job.id)).size, data.items.length)
})

test('공고 스킬은 체크할 수 있는 스킬 목록 안에 있다', () => {
  const known = new Set<string>(CAREER_SKILLS)
  for (const job of data.items)
    for (const skill of job.skills) assert.ok(known.has(skill), `${job.id}: ${skill}`)
})

test('연봉은 min ≤ max', () => {
  for (const job of data.items) if (job.salary) assert.ok(job.salary.min <= job.salary.max, job.id)
})

test('수집 기준 — 한국 지원 불가 공고는 화면에 올리지 않고, 확인 필요는 올린다', () => {
  assert.equal(isListableJob(byId('sample-protocol-rust')), false) // koreaEligible: no
  assert.equal(isListableJob(byId('sample-smart-contract')), true) // unclear
  assert.equal(isListableJob(byId('sample-frontend-dapp')), true) // yes
})

test('모든 조건이 맞으면 100점, 조건별 결과가 모두 맞음', () => {
  const job = byId('sample-frontend-dapp')
  const profile: CareerProfile = {
    roles: ['frontend'],
    skills: [...job.skills],
    workModes: ['remote'],
    minSalary: { amount: 60_000, currency: 'USD' },
  }
  const fit = computeFit(job, profile)
  assert.equal(fit.score, 100)
  assert.deepEqual(fit.missingSkills, [])
  assert.deepEqual(
    fit.checks.map((check) => [check.key, check.state]),
    [
      ['role', 'match'],
      ['workMode', 'match'],
      ['salary', 'match'],
    ]
  )
})

test('체크하지 않은 항목은 점수에서 빠진다 — 스킬만 체크하면 스킬 비율이 곧 점수', () => {
  const job = byId('sample-smart-contract') // Solidity, EVM, Foundry, DeFi
  const fit = computeFit(job, { ...emptyCareerProfile(), skills: ['Solidity', 'EVM'] })
  assert.equal(fit.score, 50)
  assert.deepEqual(fit.matchedSkills, ['Solidity', 'EVM'])
  assert.deepEqual(fit.missingSkills, ['Foundry', 'DeFi'])
  assert.deepEqual(fit.checks, [])
})

test('직무가 다르면 그 몫만큼 깎이고 안 맞음으로 표시', () => {
  const job = byId('sample-backend-indexer')
  const fit = computeFit(job, { ...emptyCareerProfile(), roles: ['frontend'] })
  assert.equal(fit.score, 0)
  assert.equal(fit.checks[0].state, 'gap')
})

test('연봉 비공개는 절반 점수와 확인 필요', () => {
  const job = byId('sample-backend-indexer')
  const fit = computeFit(job, {
    ...emptyCareerProfile(),
    roles: ['backend'],
    minSalary: { amount: 80_000, currency: 'USD' },
  })
  // 직무 25 + 연봉 6 → 31/37
  assert.equal(fit.score, Math.round((31 / 37) * 100))
  assert.equal(fit.checks.find((check) => check.key === 'salary')?.state, 'info')
})

test('직무나 스킬을 하나도 체크하지 않으면 적합도를 계산하지 않는다', () => {
  assert.equal(isProfileReady(null), false)
  assert.equal(isProfileReady(emptyCareerProfile()), false)
  assert.equal(isProfileReady({ ...emptyCareerProfile(), workModes: ['remote'] }), false)
  assert.equal(isProfileReady({ ...emptyCareerProfile(), skills: ['Rust'] }), true)
})

test('연봉 표시 — 원래 통화는 그대로, 다른 통화로 볼 때만 환산', () => {
  assert.equal(formatMoney(70_000, 'USD'), '$70k')
  assert.equal(formatMoney(55_000_000, 'KRW'), '5,500만')
  assert.equal(formatMoney(150_000_000, 'KRW'), '1.5억')
  assert.equal(formatMoney(70_000, 'USD', 'KRW'), '9,800만')
  const usd = { min: 70_000, max: 110_000, currency: 'USD' } as const
  assert.equal(formatSalary(usd, 'KRW'), '9,800만 – 1.5억원')
  assert.equal(formatSalary(usd, 'USD'), '$70k – $110k')
  // 한국 공고는 원화 그대로 보인다
  assert.equal(formatSalary(byId('sample-product-manager').salary, 'KRW'), '6,000만 – 9,000만원')
  assert.equal(formatSalary(null, 'KRW'), '연봉 비공개')
})

test('원화 공고도 달러 희망 연봉과 비교된다', () => {
  const job = byId('sample-product-manager') // 6,000만 – 9,000만원
  const ok = computeFit(job, {
    ...emptyCareerProfile(),
    roles: ['product'],
    minSalary: { amount: 60_000, currency: 'USD' },
  })
  assert.equal(ok.checks.find((check) => check.key === 'salary')?.state, 'match')
  const gap = computeFit(job, {
    ...emptyCareerProfile(),
    roles: ['product'],
    minSalary: { amount: 100_000_000, currency: 'KRW' },
  })
  assert.equal(gap.checks.find((check) => check.key === 'salary')?.state, 'gap')
})

test('통화를 바꾸면 희망 연봉은 가장 가까운 단계로 옮겨진다', () => {
  assert.equal(nearestSalaryStep(null, 'KRW'), null)
  assert.deepEqual(nearestSalaryStep({ amount: 60_000, currency: 'USD' }, 'KRW'), {
    amount: 80_000_000,
    currency: 'KRW',
  })
  assert.deepEqual(nearestSalaryStep({ amount: 60_000_000, currency: 'KRW' }, 'USD'), {
    amount: 40_000,
    currency: 'USD',
  })
  assert.deepEqual(nearestSalaryStep({ amount: 40_000, currency: 'USD' }, 'USD'), {
    amount: 40_000,
    currency: 'USD',
  })
})

test('통화 선택 — 처음에는 원화, 저장한 값은 다시 읽힌다', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  }
  assert.equal(loadCurrency(storage), 'KRW')
  saveCurrency('USD', storage)
  assert.equal(loadCurrency(storage), 'USD')
})

test('검색 — 제목 · 회사 · 스킬', () => {
  assert.equal(searchJobs(data.items, '  ').length, data.items.length)
  const solidity = searchJobs(data.items, 'solidity')
  assert.ok(solidity.length > 0 && solidity.every((job) => job.skills.includes('Solidity')))
})

test('내 조건 저장 · 읽기 · 깨진 기록은 무시 · 예전 필드는 버린다', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  }
  const profile = { ...emptyCareerProfile(), skills: ['Rust'] }
  assert.equal(saveCareerProfile(profile, storage), true)
  assert.deepEqual(loadCareerProfile(storage), profile)

  // 지난 버전에 있던 needKorea 는 읽을 때 사라진다
  memory.set('chainery-career-profile', JSON.stringify({ ...profile, needKorea: true }))
  assert.deepEqual(loadCareerProfile(storage), profile)

  memory.set('chainery-career-profile', '{"roles":["nope"]}')
  assert.equal(loadCareerProfile(storage), null)

  saveCareerProfile(null, storage)
  assert.equal(loadCareerProfile(storage), null)
})
