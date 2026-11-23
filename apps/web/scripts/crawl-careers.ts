// 채용 공고 수집 — 웹3 회사들의 공개 채용 API(Greenhouse · Lever · Ashby)에서 공고를 받아
// public/cryptopedia/careers.json 에 굳힌다. 화면(/careers)은 이 파일을 읽는다.
//
// 사용: npx tsx scripts/crawl-careers.ts [--dry]
//   --dry  파일을 쓰지 않고 몇 개가 모였는지만 본다
// 데이터가 바뀌면 다시 돌리고 커밋한다. 꼭 넣을 회사는 아래 BOARDS 에 한 줄.
//
// 출처 (모두 로그인 · 키 · 비용 없음):
//  1. 회사 ATS 공개 API — Greenhouse · Lever · Ashby. 회사가 공고를 외부에 내보내라고 연 공식 API.
//     BOARDS 에 적은 회사 + JobStash 공고 링크에서 찾은 회사 보드(자동 확장)
//  2. JobStash 공개 API — 웹3 회사 공고 모음. 웹3 회사(crypto)로 분류된 공고 중 지원 링크가 공개된 것만
//  3. 웹3 잡보드 RSS — CryptoJobsList · CryptocurrencyJobs. 지원 링크는 잡보드 공고 페이지(출처 표시)
// 같은 공고는 회사 원문(1) → 2 → 3 순서로 하나만 남긴다.
// LinkedIn 은 약관상 자동 수집이 금지라 넣지 않는다.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  atsBoardFromUrl,
  dedupeJobs,
  htmlToText,
  jobStashSeniority,
  locationFromSentence,
  parseRssItems,
  shortKoreanAddress,
  splitTitleAtCompany,
  stripBoilerplate,
  toCareerJob,
  type RawPosting,
} from '../lib/careers-collect'
import { careersSchema, isListableJob, type CareerJob, type WorkMode } from '../lib/careers'
import { applyDetails, careerDetailsSchema } from '../lib/careers-translate'

interface Board {
  ats: RawPosting['ats']
  board: string
  company: string
  chains?: string[]
  /** JobStash 에서 자동으로 찾은 보드 — 실패해도 수집을 멈추지 않는다 */
  discovered?: boolean
}

const BOARDS: Board[] = [
  { ats: 'ashby', board: 'ava-labs', company: 'Ava Labs', chains: ['Avalanche'] },
  { ats: 'greenhouse', board: 'aptoslabs', company: 'Aptos Labs', chains: ['Aptos'] },
  { ats: 'ashby', board: 'mystenlabs', company: 'Mysten Labs', chains: ['Sui'] },
  { ats: 'lever', board: 'offchainlabs', company: 'Offchain Labs', chains: ['Arbitrum'] },
  { ats: 'greenhouse', board: 'layerzerolabs', company: 'LayerZero Labs' },
  { ats: 'greenhouse', board: 'ripple', company: 'Ripple', chains: ['XRP Ledger'] },
  { ats: 'greenhouse', board: 'coinbase', company: 'Coinbase' },
  { ats: 'greenhouse', board: 'okx', company: 'OKX' },
  { ats: 'greenhouse', board: 'gemini', company: 'Gemini' },
  { ats: 'greenhouse', board: 'bitgo', company: 'BitGo' },
  { ats: 'greenhouse', board: 'fireblocks', company: 'Fireblocks' },
  { ats: 'greenhouse', board: 'consensys', company: 'Consensys', chains: ['Ethereum'] },
  { ats: 'ashby', board: 'consensys', company: 'Consensys', chains: ['Ethereum'] },
  { ats: 'ashby', board: 'circle', company: 'Circle' },
  { ats: 'ashby', board: 'alchemy', company: 'Alchemy' },
  { ats: 'ashby', board: 'ledger', company: 'Ledger' },
  { ats: 'ashby', board: 'phantom', company: 'Phantom' },
  { ats: 'ashby', board: 'paradigm', company: 'Paradigm' },
  { ats: 'ashby', board: 'theori', company: 'Theori' },
  { ats: 'lever', board: 'anchorage', company: 'Anchorage Digital' },
  { ats: 'lever', board: 'animocabrands', company: 'Animoca Brands' },
  // 국내 — 나인하이어 (사이트맵에 공고가 올라오는 회사만. 위메이드 · 아이오트러스트는 사이트맵에 공고가 없어 빠짐)
  { ats: 'ninehire', board: 'coinone', company: '코인원' },
]

const OUT = join(__dirname, '../public/cryptopedia/careers.json')
/** 한국어 정리 결과 (scripts/translate-careers.ts 가 쓴다) */
const DETAILS = join(__dirname, '../public/cryptopedia/careers-detail.json')
/** 공고 본문 — 번역 입력. 화면에 쓰지 않고 커밋하지 않는다 (.gitignore) */
const TEXT_CACHE = join(__dirname, '../.cache/careers-text.json')

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { 'user-agent': 'chainery-careers-collector' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}

const WORKPLACE: Record<string, WorkMode> = {
  remote: 'remote',
  hybrid: 'hybrid',
  onsite: 'onsite',
  'on-site': 'onsite',
}
const workplaceOf = (value: unknown) =>
  typeof value === 'string' ? (WORKPLACE[value.toLowerCase()] ?? null) : null

const annualUsd = (min: unknown, max: unknown, currency: unknown): CareerJob['salary'] =>
  typeof min === 'number' && typeof max === 'number' && min >= 20_000 && max >= min
    ? currency === 'USD' || currency === 'KRW'
      ? { min, max, currency }
      : null
    : null

async function greenhouse(b: Board): Promise<RawPosting[]> {
  const data = await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${b.board}/jobs?content=true`
  )
  return data.jobs.map((job: any) => ({
    ats: 'greenhouse',
    board: b.board,
    id: String(job.id),
    title: job.title,
    company: b.company,
    location: job.location?.name?.trim() ?? '',
    isRemote: null,
    workplace: null,
    text: htmlToText(job.content ?? ''),
    url: job.absolute_url,
    postedAt: job.first_published ?? job.updated_at,
    // Greenhouse 는 회사가 정했을 때만 지원 마감일을 준다
    closesAt: job.application_deadline ?? null,
    salary: null,
    chains: b.chains ?? [],
  }))
}

async function lever(b: Board): Promise<RawPosting[]> {
  const data = await getJson(`https://api.lever.co/v0/postings/${b.board}?mode=json`)
  return data.map((job: any) => {
    const lists = (job.lists ?? [])
      .map((list: any) => `${list.text}\n${htmlToText(list.content ?? '')}`)
      .join('\n')
    const salary = job.salaryRange
    return {
      ats: 'lever',
      board: b.board,
      id: job.id,
      title: job.text,
      company: b.company,
      location: [job.categories?.location, ...(job.categories?.allLocations ?? [])]
        .filter((value, index, all) => value && all.indexOf(value) === index)
        .join('; '),
      isRemote: job.workplaceType === 'remote' ? true : null,
      workplace: workplaceOf(job.workplaceType),
      text: [job.descriptionPlain, lists, job.additionalPlain].filter(Boolean).join('\n'),
      url: job.hostedUrl,
      postedAt: new Date(job.createdAt).toISOString(),
      employment: job.categories?.commitment ?? null,
      salary:
        salary?.interval === 'per-year-salary'
          ? annualUsd(salary.min, salary.max, salary.currency)
          : null,
      chains: b.chains ?? [],
    }
  })
}

async function ashby(b: Board): Promise<RawPosting[]> {
  const data = await getJson(
    `https://api.ashbyhq.com/posting-api/job-board/${b.board}?includeCompensation=true`
  )
  return data.jobs
    .filter((job: any) => job.isListed !== false)
    .map((job: any) => {
      const pay = job.compensation?.summaryComponents?.find(
        (part: any) => part.compensationType === 'Salary' && part.interval === '1 YEAR'
      )
      return {
        ats: 'ashby',
        board: b.board,
        id: job.id,
        title: job.title,
        company: b.company,
        location: [job.location, ...(job.secondaryLocations ?? []).map((s: any) => s.location)]
          .filter(Boolean)
          .join('; '),
        isRemote: job.isRemote ?? null,
        workplace: workplaceOf(job.workplaceType),
        text: job.descriptionPlain ?? htmlToText(job.descriptionHtml ?? ''),
        url: job.jobUrl,
        postedAt: job.publishedAt,
        employment: job.employmentType ?? null,
        salary: pay ? annualUsd(pay.minValue, pay.maxValue, pay.currencyCode) : null,
        chains: b.chains ?? [],
      }
    })
}

/* 나인하이어 — 공개 API 가 없어 구글처럼 읽는다: 사이트맵에 있는 공고 페이지를 받아
   페이지에 들어 있는 공고 데이터(__NEXT_DATA__)를 쓴다. robots.txt 가 공고 페이지 수집을 허용한다.
   화면이 쓰는 내부 API(/_backend)는 쓰지 않는다. 회사 서버에 부담이 없게 한 장씩 천천히 받는다 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function getText(url: string) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'chainery-careers-collector' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.text()
}

/** '대한민국 서울특별시 영등포구 여의대로 108 …' → '서울 영등포구' */
const shortAddress = (address: string) =>
  address
    .replace(/^대한민국\s*/, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')
    .replace(/특별시|광역시|특별자치시/, '')

const NINEHIRE_SENIORITY = (career: any): CareerJob['seniority'] | undefined => {
  if (!career) return undefined
  if (career.type === 'newcomer') return 'junior'
  const over = career.range?.over ?? 0
  if (over >= 10) return 'lead'
  if (over >= 6) return 'senior'
  return undefined
}

async function ninehire(b: Board): Promise<RawPosting[]> {
  const sitemap = await getText(`https://${b.board}.ninehire.site/sitemap.xml`)
  const urls = [
    ...new Set(
      sitemap.match(/https:\/\/[a-z0-9-]+\.ninehire\.site\/job_posting\/[A-Za-z0-9]+/g) ?? []
    ),
  ]
  const postings: RawPosting[] = []
  for (const url of urls) {
    await sleep(500)
    const html = await getText(url)
    const json = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1]
    if (!json) continue
    const page = JSON.parse(json).props?.pageProps
    const recruitment = page?.recruitment
    if (
      !recruitment ||
      recruitment.status !== 'in_progress' ||
      !recruitment.jobPostingIsActive ||
      recruitment.isSample
    )
      continue
    const title: string = recruitment.externalTitle || recruitment.title
    const location = (recruitment.jobLocations ?? [])
      .map((place: any) => shortAddress(place.addressName ?? ''))
      .filter(Boolean)
      .join('; ')
    postings.push({
      ats: 'ninehire',
      board: b.board,
      id: recruitment.addressKey,
      title,
      company: b.company,
      location: location || '대한민국',
      isRemote: /원격|재택/.test(title) ? true : null,
      workplace: null,
      text: htmlToText(page.jobPosting?.content ?? ''),
      url,
      postedAt: recruitment.createdAt,
      salary: null,
      chains: b.chains ?? [],
      category: recruitment.jobGroup?.title ?? '',
      seniority: NINEHIRE_SENIORITY(recruitment.career),
      employment: recruitment.employmentType?.[0] ?? null,
      // 나인하이어는 마감 방식을 준다 — 'until_filled'(채용 시 마감)가 아니면 마감일
      closesAt: recruitment.deadlineType === 'until_filled' ? null : recruitment.endAt,
    })
  }
  return postings
}

const ADAPTERS = { greenhouse, lever, ashby, ninehire }

/* ── JobStash — 웹3 회사 공고 모음 (middleware.jobstash.xyz 공개 API, robots.txt 전체 허용) ── */
async function jobStashAll(): Promise<any[]> {
  const all: any[] = []
  for (let page = 1; page <= 40; page++) {
    const data = await getJson(
      `https://middleware.jobstash.xyz/jobs/list?page=${page}&limit=500&organizationClassifications=crypto`
    )
    all.push(...data.data)
    if (!data.data.length || all.length >= data.total) break
    await sleep(500)
  }
  return all
}

function jobStashRaw(job: any): RawPosting | null {
  // 'protected' 공고는 JobStash 회원만 지원 링크를 볼 수 있어 뺀다
  if (job.access !== 'public' || !job.url || !job.organization?.name) return null
  const remote = job.workArrangement?.remoteOptions ?? []
  const global = remote.some(
    (option: any) =>
      option.scope === 'global' &&
      !option.includedRegions?.length &&
      !option.includedCountries?.length
  )
  const location = shortKoreanAddress(job.location ?? '') || (global ? 'Global' : '')
  const mode = String(job.locationType ?? '').toLowerCase()
  return {
    ats: 'jobstash',
    board: 'jobstash',
    id: job.shortUUID ?? job.id,
    title: job.title,
    company: job.organization.name,
    location,
    isRemote: job.workArrangement?.fullyRemote || global ? true : null,
    workplace: workplaceOf(mode),
    text: [
      job.summary,
      job.description,
      ...(job.responsibilities ?? []),
      ...(job.requirements ?? []),
      (job.tags ?? []).map((t: any) => t.name).join(', '),
    ]
      .filter(Boolean)
      .join('\n'),
    url: job.url,
    postedAt: new Date(job.timestamp).toISOString(),
    salary: annualUsd(job.minimumSalary, job.maximumSalary, job.salaryCurrency),
    chains: [],
    category: String(job.classification ?? '')
      .replace(/_/g, ' ')
      .toLowerCase(),
    seniority: jobStashSeniority(job.seniority),
    employment: job.commitment ?? null,
    source: 'web3-board',
  }
}

/* ── 웹3 잡보드 RSS ── */
async function cryptoJobsList(): Promise<RawPosting[]> {
  const items = parseRssItems(await getText('https://cryptojobslist.com/rss'))
  return items.map((item) => ({
    ats: 'cryptojobslist',
    board: 'rss',
    id: item.link.split('/').pop() ?? item.link,
    title: item.title,
    company: item.creator,
    location: item.location,
    // 위치 칸이 비어도 주소(…-remote-at-kraken)에 원격이 적혀 있다
    isRemote: /-remote(-|$)/i.test(item.link) ? true : null,
    workplace: null,
    // 맨 앞 'Tags: …' 줄은 잡보드 분류라 본문에서 뺀다
    text: htmlToText(item.description)
      .split('\n')
      .filter((line) => !/^\s*Tags:/.test(line))
      .join('\n'),
    url: item.link,
    postedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    // 고용 형태는 'Tags:' 줄의 'Web3 Full Time Jobs' 같은 분류에만 있다
    employment:
      /Tags:[^\n]*?(Full Time|Part Time|Internship|Contract)/i.exec(
        htmlToText(item.description)
      )?.[1] ?? null,
    salary: null,
    chains: [],
    source: 'web3-board',
  }))
}

async function cryptocurrencyJobs(): Promise<RawPosting[]> {
  const items = parseRssItems(await getText('https://cryptocurrencyjobs.co/index.xml'))
  return items.map((item) => {
    const [title, company] = splitTitleAtCompany(item.title)
    return {
      ats: 'cryptocurrencyjobs',
      board: 'rss',
      id: item.link.replace(/\/$/, '').split('/').pop() ?? item.link,
      title,
      company,
      location: locationFromSentence(item.description),
      isRemote: /remote/i.test(item.description) ? true : null,
      workplace: null,
      text: item.description,
      url: item.link,
      postedAt: new Date(item.pubDate).toISOString(),
      salary: null,
      chains: [],
      source: 'web3-board',
    }
  })
}

/** 회사별로 공통 문구를 지운다 (모음 서비스는 회사가 섞여 있으므로) */
function stripByCompany(raws: RawPosting[]) {
  const groups = new Map<string, RawPosting[]>()
  for (const raw of raws) groups.set(raw.company, [...(groups.get(raw.company) ?? []), raw])
  return [...groups.values()].flatMap(stripBoilerplate)
}

/** 동시에 몇 개씩만 — 한 서비스에 요청이 몰리지 않게 */
async function inBatches<T, R>(list: T[], size: number, run: (item: T) => Promise<R>) {
  const out: R[] = []
  for (let i = 0; i < list.length; i += size)
    out.push(...(await Promise.all(list.slice(i, i + size).map(run))))
  return out
}

async function main() {
  const dry = process.argv.includes('--dry')
  const fetchedAt = new Date().toISOString()
  const jobs: CareerJob[] = []
  const stats: Record<string, { raw: number; kept: number }> = {}
  let failedFixed = 0

  const texts: Record<string, string> = {}
  const keep = (label: string, raws: RawPosting[]) => {
    const mapped = raws.map((raw) => {
      const job = toCareerJob(raw, fetchedAt)
      if (job) texts[job.id] = raw.text
      return job
    })
    const kept = mapped.filter((job): job is CareerJob => !!job && isListableJob(job))
    jobs.push(...kept)
    const stat = (stats[label] ??= { raw: 0, kept: 0 })
    stat.raw += raws.length
    stat.kept += kept.length
    return kept.length
  }

  // 1) JobStash 를 먼저 받아 회사 보드를 넓힌다
  let stash: any[] = []
  try {
    stash = await jobStashAll()
    console.log(`JobStash: 웹3 회사 공고 ${stash.length}개`)
  } catch (error) {
    console.warn(`JobStash 실패: ${(error as Error).message}`)
  }
  const boardKey = (b: { ats: string; board: string }) => `${b.ats}:${b.board.toLowerCase()}`
  const boards = [...BOARDS]
  const known = new Set(boards.map(boardKey))
  for (const job of stash) {
    const found = job.url ? atsBoardFromUrl(job.url) : null
    if (!found || known.has(boardKey(found)) || !job.organization?.name) continue
    known.add(boardKey(found))
    boards.push({ ...found, company: job.organization.name, discovered: true })
  }
  console.log(
    `회사 보드 ${boards.length}곳 (직접 ${BOARDS.length} · 자동 ${boards.length - BOARDS.length})\n`
  )

  // 2) 회사 ATS 원문
  const crawled = new Set<string>()
  await inBatches(boards, 4, async (b) => {
    try {
      const raws = await ADAPTERS[b.ats as keyof typeof ADAPTERS](b)
      const n = keep(b.discovered ? '회사 ATS (자동)' : '회사 ATS (직접)', stripBoilerplate(raws))
      crawled.add(boardKey(b))
      if (!b.discovered || n) console.log(`${b.company} (${b.ats}): ${raws.length}개 중 ${n}개`)
    } catch (error) {
      if (!b.discovered) {
        failedFixed++
        console.warn(`${b.company} (${b.ats}) 실패: ${(error as Error).message}`)
      }
    }
  })

  // 3) JobStash — 회사 ATS 로 이미 받은 공고는 건너뛴다
  const stashRaws = stash
    .filter((job) => {
      const found = job.url ? atsBoardFromUrl(job.url) : null
      return !found || !crawled.has(boardKey(found))
    })
    .map(jobStashRaw)
    .filter((raw): raw is RawPosting => !!raw)
  keep('JobStash', stripByCompany(stashRaws))

  // 4) 웹3 잡보드 RSS
  for (const [label, feed] of [
    ['CryptoJobsList', cryptoJobsList],
    ['CryptocurrencyJobs', cryptocurrencyJobs],
  ] as const) {
    try {
      keep(label, stripByCompany(await feed()))
    } catch (error) {
      console.warn(`${label} 실패: ${(error as Error).message}`)
    }
  }

  console.log('\n출처별 (받은 공고 → 화면에 올릴 공고, 중복 제거 전)')
  for (const [label, stat] of Object.entries(stats))
    console.log(`  ${label}: ${stat.raw} → ${stat.kept}`)

  // 한국에서 지원 가능한 것이 확실한 공고를 먼저, 그다음 최신 순
  // (중복은 넣은 순서 — 회사 원문 우선 — 로 먼저 지운다)
  const ORDER = { yes: 0, unclear: 1, no: 2 }
  // 이미 번역한 공고는 한국어 요약 · 본문으로 본 한국 지원 여부를 붙인다 (지원 불가가 되면 뺀다)
  const details = careerDetailsSchema.parse(
    JSON.parse(await readFile(DETAILS, 'utf8').catch(() => '{}'))
  )
  const items = applyDetails(dedupeJobs(jobs), details)
    .filter(isListableJob)
    .sort(
      (a, b) =>
        ORDER[a.koreaEligible] - ORDER[b.koreaEligible] || b.postedAt.localeCompare(a.postedAt)
    )
  const data = careersSchema.parse({ sample: false, items })

  const count = (key: keyof CareerJob) =>
    Object.entries(
      items.reduce<Record<string, number>>((acc, job) => {
        const value = String(job[key])
        acc[value] = (acc[value] ?? 0) + 1
        return acc
      }, {})
    )
      .map(([value, n]) => `${value} ${n}`)
      .join(' · ')

  console.log(`\n합계 ${items.length}개 (직접 넣은 회사 중 실패 ${failedFixed})`)
  console.log(`한국 지원: ${count('koreaEligible')}`)
  console.log(`직무: ${count('role')}`)
  console.log(`근무: ${count('workMode')}`)
  console.log(
    `연봉 있음 ${items.filter((job) => job.salary).length} · 스킬 없음 ${items.filter((job) => !job.skills.length).length}`
  )

  // 회사 절반 이상이 실패했거나 하나도 못 모았으면 기존 파일을 덮어쓰지 않는다 (네트워크 문제로 화면이 비지 않게)
  if (!items.length || failedFixed > BOARDS.length / 2) {
    console.error('수집 결과가 비정상이라 파일을 쓰지 않았어요')
    process.exit(1)
  }

  if (!dry) {
    await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`)
    console.log(`→ ${OUT}`)
    const listed = Object.fromEntries(items.map((job) => [job.id, texts[job.id] ?? '']))
    await mkdir(dirname(TEXT_CACHE), { recursive: true })
    await writeFile(TEXT_CACHE, JSON.stringify(listed))
    const pending = items.filter((job) => !details[job.id]).length
    console.log(`한국어 정리 안 된 공고 ${pending}개 — npx tsx scripts/translate-careers.ts`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
