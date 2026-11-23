import assert from 'node:assert/strict'
import test from 'node:test'

import { computeFit, emptyCareerProfile } from './careers'
import {
  atsBoardFromUrl,
  classifyEmployment,
  classifyKoreaEligibility,
  classifyRole,
  classifySeniority,
  classifyWorkMode,
  dedupeJobs,
  displayLocation,
  extractChains,
  extractSkills,
  htmlToText,
  jobStashSeniority,
  locationFromSentence,
  parseRssItems,
  parseSalary,
  refineByBody,
  shortKoreanAddress,
  splitTitleAtCompany,
  stripBoilerplate,
  summarize,
  tidyLocation,
  toCareerJob,
  type RawPosting,
} from './careers-collect'

test('Greenhouse 처럼 두 번 이스케이프된 HTML 도 평문이 된다', () => {
  const html =
    '&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Solidity&lt;/li&gt;&lt;/ul&gt;'
  assert.equal(htmlToText(html), 'Build & ship\nSolidity')
  assert.equal(htmlToText('<p>A&nbsp;B</p><br/>C'), 'A B\nC')
})

test('요약은 직무 설명 제목 뒤에서 뽑고 160자를 넘지 않는다', () => {
  const text = `About Acme\nAcme is a company.\nAbout the role\nYou will build wallets. ${'More detail. '.repeat(20)}`
  const summary = summarize(text)
  assert.ok(summary.startsWith('You will build wallets.'))
  assert.ok(summary.length <= 161)
})

test('직무는 제목으로 정한다 — 못 정하면 null', () => {
  const cases: [string, string | null][] = [
    ['Senior Frontend Engineer', 'frontend'],
    ['Full Stack Developer', 'frontend'],
    ['Smart Contract Engineer', 'smart-contract'],
    ['Site Reliability Engineer', 'protocol'],
    ['Software Engineer, Payments', 'backend'],
    ['Senior Product Manager, Wallet', 'product'],
    ['Product Designer', 'design'],
    ['Product Marketing Manager', 'community'],
    ['Developer Relations Engineer', 'devrel'],
    ['Research Analyst', 'research'],
    ['Associate General Counsel', null],
    ['Accountant', null],
    ['Senior Compliance Analyst', null],
    ['Cloud DBA', 'protocol'],
    ['Senior Backend Engineer (Data Platform)', 'backend'],
    ['Staff Data Scientist', 'research'],
    ['Head of Enterprise GTM – Shelby Platform', 'community'],
  ]
  for (const [title, role] of cases) assert.equal(classifyRole(title), role, title)
})

test('경력 단계', () => {
  assert.equal(classifySeniority('Senior Backend Engineer'), 'senior')
  assert.equal(classifySeniority('Staff Engineer'), 'senior')
  assert.equal(classifySeniority('Engineering Lead'), 'lead')
  assert.equal(classifySeniority('Junior Designer'), 'junior')
  assert.equal(classifySeniority('Backend Engineer'), 'mid')
})

test('한국에서 지원 가능한지 — 위치 문자열', () => {
  const cases: [string, string][] = [
    ['Seoul, Seoul, South Korea', 'yes'],
    ['Korea', 'yes'],
    ['APAC - Remote', 'yes'],
    ['Northeast Asia (Remote)', 'yes'],
    ['Anywhere', 'yes'],
    ['Remote (Global)', 'yes'],
    ['Remote Global (US, EU)', 'no'],
    ['Remote - USA', 'no'],
    ['New York, New York', 'no'],
    ['Remote', 'unclear'],
    ['remotely anywhere in the United States', 'no'],
    ['remotely anywhere in the world', 'yes'],
    ['Global', 'yes'],
    ['', 'unclear'],
  ]
  for (const [location, expected] of cases)
    assert.equal(classifyKoreaEligibility(location), expected, location)
  // 위치가 'Remote' 뿐이면 제목의 지역을 본다
  assert.equal(
    classifyKoreaEligibility('Remote', 'Business Development Representative - MENA'),
    'no'
  )
  assert.equal(classifyKoreaEligibility('Remote', 'Community Manager (Korea)'), 'yes')
  assert.equal(classifyKoreaEligibility('Remote', 'Senior Backend Engineer'), 'unclear')
})

test('위치 — 겹친 곳은 한 번만, 네 곳 이상이면 줄인다', () => {
  assert.equal(tidyLocation('APAC; EMEA; APAC'), 'APAC; EMEA')
  assert.equal(tidyLocation('A; B; C; D; E'), 'A; B; C 외 2곳')
})

test('근무 형태 — ATS 표시가 먼저, 없으면 위치 문자열', () => {
  assert.equal(classifyWorkMode('Seoul', null, 'hybrid'), 'hybrid')
  assert.equal(classifyWorkMode('Remote - APAC', null, null), 'remote')
  assert.equal(classifyWorkMode('Singapore', true, null), 'remote')
  assert.equal(classifyWorkMode('Seoul (Hybrid)', null, null), 'hybrid')
  assert.equal(classifyWorkMode('Seoul', null, null), 'onsite')
})

test('스킬은 목록 안의 이름으로만, 헷갈리는 단어는 거른다', () => {
  assert.deepEqual(
    extractSkills('We use TypeScript, React and Golang. Experience with Foundry and k8s.'),
    ['TypeScript', 'React', 'Go', 'Foundry', 'Kubernetes']
  )
  assert.deepEqual(extractSkills('Own our Go to market plan. React Native app.'), [])
  assert.deepEqual(extractSkills('Fluent in English and Korean'), ['Korean', 'English'])
  assert.deepEqual(extractSkills('Written in English.'), [])
})

test('체인 — 회사 기본값과 본문에서 찾은 것을 합친다', () => {
  assert.deepEqual(extractChains('Bridges to Ethereum and Solana', ['Avalanche']), [
    'Avalanche',
    'Ethereum',
    'Solana',
  ])
})

test('연봉 — 본문의 달러 연봉 범위만, 시급은 버린다', () => {
  assert.deepEqual(parseSalary('The base salary range is $150,000 - $200,000 USD.'), {
    min: 150_000,
    max: 200_000,
    currency: 'USD',
  })
  assert.deepEqual(parseSalary('$120k–$160k'), { min: 120_000, max: 160_000, currency: 'USD' })
  assert.equal(parseSalary('$45 - $60 per hour'), null)
  assert.equal(parseSalary('Competitive salary'), null)
})

const raw = (over: Partial<RawPosting>): RawPosting => ({
  ats: 'greenhouse',
  board: 'acme',
  id: '1',
  title: 'Senior Frontend Engineer',
  company: 'Acme',
  location: 'Seoul, South Korea',
  isRemote: null,
  workplace: null,
  text: 'About the role\nBuild our wallet in TypeScript and React. Pay: $120,000 - $160,000.',
  url: 'https://example.com/jobs/1',
  postedAt: '2026-11-01T10:00:00Z',
  salary: null,
  chains: [],
  ...over,
})

test('원문 → 화면용 공고', () => {
  const job = toCareerJob(raw({}), '2026-11-11T00:00:00Z')
  assert.ok(job)
  assert.equal(job.id, 'greenhouse-acme-1')
  assert.equal(job.role, 'frontend')
  assert.equal(job.seniority, 'senior')
  assert.equal(job.koreaEligible, 'yes')
  assert.equal(job.workMode, 'onsite')
  // wallet 은 한 번만 나와서 스킬로 보지 않는다 (회사 소개에 흔한 단어)
  assert.deepEqual(job.skills, ['TypeScript', 'React'])
  assert.deepEqual(extractSkills('Build wallets. Our wallet SDK.'), ['Wallet'])
  assert.deepEqual(job.salary, { min: 120_000, max: 160_000, currency: 'USD' })
  assert.equal(job.postedAt, '2026-11-01')
  assert.equal(job.source, 'company')
  assert.equal(toCareerJob(raw({ title: 'Tax Accountant' }), '2026-11-11T00:00:00Z'), null)
})

test('같은 회사가 두 ATS 에 올린 같은 공고는 하나만', () => {
  const a = toCareerJob(raw({ ats: 'greenhouse' }), 'x')!
  const b = toCareerJob(raw({ ats: 'ashby' }), 'x')!
  assert.equal(dedupeJobs([a, b]).length, 1)
})

test('스킬을 못 찾은 공고는 적합도에서 스킬 몫이 빠진다', () => {
  const job = { ...toCareerJob(raw({}), 'x')!, skills: [] }
  const fit = computeFit(job, { ...emptyCareerProfile(), skills: ['Rust'], roles: ['frontend'] })
  assert.equal(fit.score, 100)
})

test('한 회사 공고 절반 이상에 반복되는 문단은 지운다', () => {
  const intro = 'We are around 180 people, fully remote, backed by top investors.'
  const posts = ['A', 'B', 'C'].map((id) =>
    raw({ id, text: `${intro}\nRole ${id}: you will build the frontend for our wallet app.` })
  )
  const cleaned = stripBoilerplate(posts)
  assert.ok(cleaned.every((post) => !post.text.includes(intro)))
  assert.ok(cleaned[0].text.includes('Role A'))
  // 공고가 둘뿐이면 판단하지 않는다
  assert.equal(stripBoilerplate(posts.slice(0, 2))[0].text, posts[0].text)
})

test('위치가 Remote 뿐이면 본문의 거주 조건을 본다', () => {
  assert.equal(
    refineByBody(
      'unclear',
      'This role is fully remote; however, we’re only open to candidates based in the US, EU and UK.'
    ),
    'no'
  )
  assert.equal(refineByBody('unclear', 'Candidates based in Korea or Japan are welcome.'), 'yes')
  assert.equal(refineByBody('unclear', 'We are a remote-first team.'), 'unclear')
  // 위치로 이미 정해졌으면 본문은 보지 않는다
  assert.equal(refineByBody('yes', 'only open to candidates based in the US'), 'yes')
})

test('한국어 제목 — 직무 · 경력 · 제외 직무', () => {
  const cases: [string, string, string | null][] = [
    ['백엔드 개발자', '', 'backend'],
    ['프론트엔드 엔지니어 (React)', '', 'frontend'],
    ['블록체인 노드 운영 엔지니어', '', 'protocol'],
    ['서비스 기획자', '', 'product'],
    ['프로덕트 디자이너', '', 'design'],
    ['퍼포먼스 마케터', '', 'community'],
    ['재무기획 담당자(FP&A)', 'Finance', null],
    ['AML 모니터링 담당자', '', null],
    // 제목으로 못 정하면 직무 그룹으로
    ['Platform Squad 담당자', 'Engineering', 'protocol'],
    ['신규 담당자', 'Engineering', 'backend'],
  ]
  for (const [title, category, role] of cases)
    assert.equal(classifyRole(title, category), role, title)
  assert.equal(classifySeniority('백엔드 개발 팀장'), 'lead')
  assert.equal(classifySeniority('신입 백엔드 개발자'), 'junior')
})

test('나인하이어 공고 — 서울 주소는 한국 지원 가능, 경력 조건은 제목에 단계가 없을 때만', () => {
  const job = toCareerJob(
    raw({
      ats: 'ninehire',
      board: 'coinone',
      title: '백엔드 개발자',
      company: '코인원',
      location: '서울 영등포구',
      category: 'Engineering',
      seniority: 'senior',
    }),
    'x'
  )!
  assert.equal(job.koreaEligible, 'yes')
  assert.equal(job.workMode, 'onsite')
  assert.equal(job.role, 'backend')
  assert.equal(job.seniority, 'senior')
  assert.equal(
    toCareerJob(raw({ title: '주니어 백엔드 개발자', seniority: 'senior' }), 'x')!.seniority,
    'junior'
  )
})

test('여러 출처에 올라온 같은 공고 — 같은 링크이거나 같은 회사 · 제목이면 먼저 넣은 것만', () => {
  const company = toCareerJob(raw({}), 'x')!
  const board = toCareerJob(
    raw({
      ats: 'jobstash',
      board: 'jobstash',
      company: 'Acme Inc.',
      location: 'Remote',
      source: 'web3-board',
    }),
    'x'
  )!
  assert.equal(board.source, 'web3-board')
  assert.deepEqual(dedupeJobs([company, board]), [company])
  const sameLink = { ...board, id: 'other', title: 'Other title', company: 'Other' }
  assert.equal(dedupeJobs([company, sameLink]).length, 1)
})

test('공고 링크로 회사 ATS 보드를 찾는다', () => {
  assert.deepEqual(atsBoardFromUrl('https://job-boards.greenhouse.io/Aptoslabs/jobs/123'), {
    ats: 'greenhouse',
    board: 'aptoslabs',
  })
  assert.deepEqual(atsBoardFromUrl('https://jobs.lever.co/offchainlabs/abc-def'), {
    ats: 'lever',
    board: 'offchainlabs',
  })
  assert.deepEqual(atsBoardFromUrl('https://jobs.ashbyhq.com/Ava%20Labs/uuid?src=x'), {
    ats: 'ashby',
    board: 'Ava Labs',
  })
  assert.equal(atsBoardFromUrl('https://ripple.com/careers/all-jobs/job/1'), null)
})

test('잡보드 RSS · 위치 문장 · 제목에서 회사 분리', () => {
  const xml = `<rss><channel><item><title><![CDATA[Web3 Core Engineer]]></title>
    <description><![CDATA[<p>Build &amp; ship</p>]]></description>
    <link>https://cryptojobslist.com/jobs/a</link><dc:creator><![CDATA[Brave]]></dc:creator>
    <media:location>Remote</media:location><pubDate>Tue, 10 Nov 2026 23:29:51 +0200</pubDate></item></channel></rss>`
  assert.deepEqual(parseRssItems(xml), [
    {
      title: 'Web3 Core Engineer',
      link: 'https://cryptojobslist.com/jobs/a',
      description: '<p>Build &amp; ship</p>',
      creator: 'Brave',
      location: 'Remote',
      pubDate: 'Tue, 10 Nov 2026 23:29:51 +0200',
    },
  ])
  assert.deepEqual(splitTitleAtCompany('Backend Developer at RedStone'), [
    'Backend Developer',
    'RedStone',
  ])
  assert.equal(
    locationFromSentence(
      'RedStone is looking to hire a Backend Developer to join their team. This is a full-time position that can be done remotely anywhere in Europe or on-site in Warsaw.'
    ),
    'remotely anywhere in Europe or on-site in Warsaw'
  )
  assert.equal(
    locationFromSentence('This is a full-time position that is based in Miami FL.'),
    'Miami FL'
  )
})

test('국내 주소는 시 · 구까지만, JobStash 경력 단계', () => {
  assert.equal(shortKoreanAddress('서울특별시 강남구 테헤란로 129'), '서울 강남구')
  assert.equal(shortKoreanAddress('람다256서울특별시 서초구 강남대로 369'), '서울 서초구')
  assert.equal(
    shortKoreanAddress('Seoul, Gangnam-gu, Teheran-ro 124, Samwoo Building'),
    'Seoul Gangnam-gu'
  )
  assert.equal(shortKoreanAddress('London, United Kingdom'), 'London, United Kingdom')
  assert.equal(jobStashSeniority('1'), 'junior')
  assert.equal(jobStashSeniority('3'), undefined)
  assert.equal(jobStashSeniority('5'), 'lead')
})

test('화면 위치 — 장소만 한국어로, 원격 같은 근무 방식은 뺀다', () => {
  const cases: [string, string][] = [
    ['100% remote with no geographical restrictions. Work remotely from anywhere', '전 세계'],
    ['Remote - APAC', '아시아·태평양'],
    ['Seoul, South Korea', '서울'],
    ['Seoul Gangnam-gu', '서울 강남구'],
    ['서울 영등포구', '서울 영등포구'],
    ['Global; Hong Kong; Singapore', '전 세계 · 홍콩 · 싱가포르'],
    ['Anywhere in the world, excluding Russia and Belarus', '전 세계'],
    ['remotely anywhere in Europe or on-site in Warsaw', '유럽 · Warsaw'],
    ['Remote (US/Asia timezones preferred)', '미국 · 아시아'],
    ['Remote', ''],
    ['', ''],
  ]
  for (const [location, expected] of cases)
    assert.equal(displayLocation(location), expected, location)
})

test('고용 형태는 주어진 값 → 제목 → 본문 문장 순으로 고른다', () => {
  assert.equal(classifyEmployment('Full-time', 'Engineer'), 'fulltime')
  assert.equal(classifyEmployment('FullTime', 'Engineer'), 'fulltime')
  assert.equal(classifyEmployment(null, 'Research Intern'), 'intern')
  assert.equal(classifyEmployment(null, 'Contract Solidity Developer'), 'contract')
  assert.equal(classifyEmployment(null, 'Engineer', 'This is a full-time position.'), 'fulltime')
  assert.equal(classifyEmployment(null, 'Engineer', 'We build wallets.'), null)
})
