import { z } from 'zod'

/* 채용 (/careers) — 공고 데이터 계약 · 수집 기준 · 적합도 계산 · 내 조건 저장.
   공고는 크롤링(LinkedIn · Web3 잡보드 · 텔레그램 등)으로 모으고, 지금은 public/cryptopedia/careers.json 샘플로 화면을 그린다.
   이력서는 받지 않는다 — 사용자가 직무·스킬·근무 형태·연봉만 직접 체크하고, 그 값으로 적합도와 근거를 보여 준다.
   지원은 원문 공고에서 한다 (우리는 연결만). */

export const CAREER_ROLES = [
  { id: 'frontend', label: '프론트엔드' },
  { id: 'backend', label: '백엔드' },
  { id: 'smart-contract', label: '스마트 컨트랙트' },
  { id: 'protocol', label: '프로토콜·인프라' },
  { id: 'product', label: '프로덕트' },
  { id: 'design', label: '디자인' },
  { id: 'devrel', label: 'DevRel' },
  { id: 'community', label: '커뮤니티·마케팅' },
  { id: 'research', label: '리서치' },
] as const

export const WORK_MODES = [
  { id: 'remote', label: '원격' },
  { id: 'hybrid', label: '하이브리드' },
  { id: 'onsite', label: '출근' },
] as const

/* 한국에서 지원할 수 있는지 — 원격이어도 거주 국가를 제한하는 공고가 많아 수집할 때 적는다 (isListableJob) */
export const KOREA_ELIGIBILITY = [
  { id: 'yes', label: '한국에서 지원 가능' },
  { id: 'unclear', label: '확인 필요' },
  { id: 'no', label: '한국 지원 불가' },
] as const

export const JOB_SOURCES = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'web3-board', label: 'Web3 잡보드' },
  { id: 'telegram', label: '텔레그램' },
  { id: 'company', label: '회사 채용 페이지' },
  { id: 'chainery', label: 'chainery 등록' },
] as const

/* 체크할 수 있는 스킬 — 공고의 skills 값도 이 목록 안에서 쓴다 (테스트로 확인) */
export const CAREER_SKILLS = [
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Go',
  'Rust',
  'Python',
  'Solidity',
  'EVM',
  'Foundry',
  'Hardhat',
  'viem/ethers',
  'Avalanche',
  'Cosmos SDK',
  'Solana',
  'ZK',
  'DeFi',
  'Wallet',
  'Indexer',
  'PostgreSQL',
  'Kubernetes',
  'Figma',
  'Product',
  'Technical Writing',
  'Community',
  'Korean',
  'English',
] as const

type Ids<T extends readonly { id: string }[]> = T[number]['id']
export type CareerRole = Ids<typeof CAREER_ROLES>
export type WorkMode = Ids<typeof WORK_MODES>
export type KoreaEligibility = Ids<typeof KOREA_ELIGIBILITY>
export type JobSource = Ids<typeof JOB_SOURCES>

const idsOf = <T extends readonly { id: string }[]>(list: T) =>
  list.map((item) => item.id) as unknown as [Ids<T>, ...Ids<T>[]]

export const labelOf = (list: readonly { id: string; label: string }[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id

/* ── 연봉 통화 ──
   공고 연봉은 공고에 적힌 통화 그대로 저장하고, 사용자가 다른 통화로 볼 때만 환산한다.
   환산 환율은 고정 근사치 — 같은 통화끼리는 환산하지 않으니 한국 공고를 원화로 보면 원문 금액 그대로다. */
export const CURRENCIES = ['KRW', 'USD'] as const
export type Currency = (typeof CURRENCIES)[number]
export const USD_KRW_RATE = 1400

const moneyRangeSchema = z.object({
  min: z.number().positive(),
  max: z.number().positive(),
  currency: z.enum(CURRENCIES),
})

const jobSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  summary: z.string(),
  role: z.enum(idsOf(CAREER_ROLES)),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead']),
  workMode: z.enum(idsOf(WORK_MODES)),
  koreaEligible: z.enum(idsOf(KOREA_ELIGIBILITY)),
  location: z.string(),
  /* 연봉(연 기준) — 공고에 있을 때만. 공고에 적힌 통화 그대로 (한국 공고는 원화, 해외 공고는 달러) */
  salary: moneyRangeSchema.nullable(),
  skills: z.array(z.string()).min(1),
  chains: z.array(z.string()),
  source: z.enum(idsOf(JOB_SOURCES)),
  /* 원문 공고 — 샘플은 null 이고 지원 버튼을 비활성으로 보인다 */
  sourceUrl: z.string().url().nullable(),
  postedAt: z.string(),
  fetchedAt: z.string(),
})

export const careersSchema = z.object({
  /** true 면 화면 확인용 샘플 — 제목 아래에 샘플이라고 적는다 */
  sample: z.boolean(),
  items: z.array(jobSchema),
})

export type CareerJob = z.infer<typeof jobSchema>
export type CareersData = z.infer<typeof careersSchema>

/* ── 수집 기준 ──
   한국에서 지원할 수 없는 공고(거주 국가 제한 등)는 화면에 올리지 않는다.
   사용자가 고르는 조건이 아니라 우리가 공고를 가져올 때 거르는 기준이다.
   'unclear'(공고에 지역 조건이 적혀 있지 않음)는 일단 올린다. */
export const isListableJob = (job: CareerJob) => job.koreaEligible !== 'no'

/* ── 내 조건 ── */

export const careerProfileSchema = z.object({
  roles: z.array(z.enum(idsOf(CAREER_ROLES))),
  skills: z.array(z.string()),
  workModes: z.array(z.enum(idsOf(WORK_MODES))),
  /** 희망 최소 연봉 — 고른 통화 그대로. null 이면 상관없음 (예전 기록에 없으면 null) */
  minSalary: z
    .object({ amount: z.number().positive(), currency: z.enum(CURRENCIES) })
    .nullable()
    .default(null),
})

export type CareerProfile = z.infer<typeof careerProfileSchema>

export const emptyCareerProfile = (): CareerProfile => ({
  roles: [],
  skills: [],
  workModes: [],
  minSalary: null,
})

/* 적합도를 계산할 만큼 골랐는지 — 직무나 스킬 중 하나는 있어야 한다 */
export const isProfileReady = (profile: CareerProfile | null): profile is CareerProfile =>
  !!profile && (profile.roles.length > 0 || profile.skills.length > 0)

/* ── 연봉 표시 ── */

/** 금액을 다른 통화로 — 같은 통화면 그대로 */
export function convertMoney(amount: number, from: Currency, to: Currency) {
  if (from === to) return amount
  return from === 'USD' ? amount * USD_KRW_RATE : amount / USD_KRW_RATE
}

/* 희망 연봉 단계 — 통화마다 딱 떨어지는 값 */
export const SALARY_STEPS: Record<Currency, readonly number[]> = {
  KRW: [40_000_000, 60_000_000, 80_000_000, 100_000_000, 150_000_000],
  USD: [40_000, 60_000, 80_000, 100_000, 130_000],
}

/** 금액 하나를 보여 줄 통화로 — 달러는 $70k, 원화는 5,500만 / 1.5억 */
export function formatMoney(amount: number, from: Currency, to: Currency = from) {
  const value = convertMoney(amount, from, to)
  if (to === 'USD') return `$${Math.round(value / 1000)}k`
  const man = value / 10_000
  if (man >= 10_000) return `${(Math.round(man / 1000) / 10).toFixed(1).replace(/\.0$/, '')}억`
  return `${(Math.round(man / 100) * 100).toLocaleString('ko-KR')}만`
}

export const formatSalary = (salary: CareerJob['salary'], to: Currency) =>
  salary
    ? `${formatMoney(salary.min, salary.currency, to)} – ${formatMoney(salary.max, salary.currency, to)}${to === 'KRW' ? '원' : ''}`
    : '연봉 비공개'

/** 통화를 바꿀 때 고른 희망 연봉을 새 통화의 가장 가까운 단계로 옮긴다 (선택이 사라지지 않게) */
export function nearestSalaryStep(
  minSalary: CareerProfile['minSalary'],
  to: Currency
): CareerProfile['minSalary'] {
  if (!minSalary || minSalary.currency === to) return minSalary
  const target = convertMoney(minSalary.amount, minSalary.currency, to)
  const amount = SALARY_STEPS[to].reduce((best, step) =>
    Math.abs(step - target) < Math.abs(best - target) ? step : best
  )
  return { amount, currency: to }
}

export const CURRENCY_STORAGE_KEY = 'chainery-career-currency'

/* ── 적합도 ──
   체크한 항목만 점수에 넣고 100점으로 맞춘다 (체크하지 않은 항목 때문에 점수가 깎이지 않게).
   스킬은 맞는 비율만큼, 직무·근무는 맞으면 전부, 연봉은 비공개면 절반. */

const WEIGHTS = { skills: 45, role: 25, workMode: 18, salary: 12 } as const

/* 공고를 펼쳤을 때 보이는 조건별 결과 — 짧은 이름 + 맞음 / 안 맞음 / 확인 필요 */
export interface FitCheck {
  key: 'role' | 'workMode' | 'salary'
  state: 'match' | 'gap' | 'info'
  label: string
}

export interface CareerFit {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  checks: FitCheck[]
}

export function computeFit(job: CareerJob, profile: CareerProfile): CareerFit {
  let earned = 0
  let possible = 0
  const checks: FitCheck[] = []
  const mine = new Set(profile.skills)
  const matchedSkills = job.skills.filter((skill) => mine.has(skill))
  const missingSkills = job.skills.filter((skill) => !mine.has(skill))

  if (profile.skills.length) {
    possible += WEIGHTS.skills
    earned += (matchedSkills.length / job.skills.length) * WEIGHTS.skills
  }

  if (profile.roles.length) {
    possible += WEIGHTS.role
    const match = profile.roles.includes(job.role)
    if (match) earned += WEIGHTS.role
    checks.push({
      key: 'role',
      state: match ? 'match' : 'gap',
      label: labelOf(CAREER_ROLES, job.role),
    })
  }

  if (profile.workModes.length) {
    possible += WEIGHTS.workMode
    const match = profile.workModes.includes(job.workMode)
    if (match) earned += WEIGHTS.workMode
    checks.push({
      key: 'workMode',
      state: match ? 'match' : 'gap',
      label: labelOf(WORK_MODES, job.workMode),
    })
  }

  if (profile.minSalary) {
    possible += WEIGHTS.salary
    let state: FitCheck['state'] = 'gap'
    const { amount, currency } = profile.minSalary
    if (!job.salary) {
      earned += WEIGHTS.salary / 2
      state = 'info'
    } else if (convertMoney(job.salary.max, job.salary.currency, currency) >= amount) {
      earned += WEIGHTS.salary
      state = 'match'
    }
    checks.push({ key: 'salary', state, label: '연봉' })
  }

  const score = possible ? Math.round((earned / possible) * 100) : 0
  return { score, matchedSkills, missingSkills, checks }
}

/* ── 검색 ── */

export function searchJobs(jobs: CareerJob[], query: string): CareerJob[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return jobs
  return jobs.filter((job) =>
    [job.title, job.company, job.summary, job.location, ...job.skills, ...job.chains]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  )
}

/* ── 내 조건 저장 — 로그인 전에는 이 브라우저의 localStorage 한 키 ── */

export const CAREER_PROFILE_STORAGE_KEY = 'chainery-career-profile'

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function loadCareerProfile(storage = browserStorage()): CareerProfile | null {
  try {
    const text = storage?.getItem(CAREER_PROFILE_STORAGE_KEY)
    if (!text) return null
    const parsed = careerProfileSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** 저장하지 못하면 false — 화면은 메모리 상태로 계속 동작한다 */
export function saveCareerProfile(profile: CareerProfile | null, storage = browserStorage()) {
  if (!storage) return false
  try {
    if (profile) storage.setItem(CAREER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    else storage.removeItem(CAREER_PROFILE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/* 원 / 달러 선택은 조건과 따로 저장한다 — 조건을 지워도 보던 통화는 그대로. 처음에는 원화 */
export function loadCurrency(storage = browserStorage()): Currency {
  try {
    return storage?.getItem(CURRENCY_STORAGE_KEY) === 'USD' ? 'USD' : 'KRW'
  } catch {
    return 'KRW'
  }
}

export function saveCurrency(currency: Currency, storage = browserStorage()) {
  try {
    storage?.setItem(CURRENCY_STORAGE_KEY, currency)
  } catch {
    // 저장하지 못해도 이번 화면에서는 고른 통화로 보인다
  }
}
