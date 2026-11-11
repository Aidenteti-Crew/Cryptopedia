import {
  CAREER_SKILLS,
  type CareerJob,
  type CareerRole,
  type EmploymentType,
  type JobSource,
  type KoreaEligibility,
  type WorkMode,
} from './careers'

/* 채용 공고 수집 — 회사 채용 페이지(ATS) 원문을 화면용 공고(CareerJob)로 바꾸는 규칙.
   네트워크는 scripts/crawl-careers.ts 가 맡고, 여기는 입력 → 출력만 있는 순수 함수라 테스트로 고정한다.
   규칙은 키워드 기반이라 틀릴 수 있다 — 직무를 못 정하면 공고를 버리고, 스킬을 못 찾으면 빈 목록으로 둔다. */

/** ATS 에서 받아 한 모양으로 맞춘 원문 */
export interface RawPosting {
  /** 어디서 받았는지 — 회사 ATS 이거나, 여러 회사 공고를 모아 둔 웹3 잡보드 */
  ats:
    | 'greenhouse'
    | 'lever'
    | 'ashby'
    | 'ninehire'
    | 'jobstash'
    | 'cryptojobslist'
    | 'cryptocurrencyjobs'
  board: string
  id: string
  title: string
  company: string
  /** 사람이 읽는 위치 문자열 (여러 곳이면 ; 로 이어 붙임) */
  location: string
  /** ATS 가 원격이라고 표시했는지 (모르면 null) */
  isRemote: boolean | null
  /** ATS 의 근무 형태 표시 — remote / hybrid / onsite (모르면 null) */
  workplace: WorkMode | null
  /** 본문 (HTML 이면 htmlToText 로 먼저 바꾼다) */
  text: string
  url: string
  postedAt: string
  /** ATS 가 구조화해서 준 연봉 (없으면 본문에서 찾는다) */
  salary: CareerJob['salary']
  /** 회사 단위로 정해 둔 체인 (본문에서 찾은 것과 합친다) */
  chains: string[]
  /** ATS 의 직무 그룹 (예: 'Engineering', 'Finance') — 제목으로 직무를 못 정할 때 쓴다 */
  category?: string
  /** 채용 페이지가 준 고용 형태 원문 ('Full-time', 'FullTime', 'INTERNSHIP', 'full_time' …) */
  employment?: string | null
  /** 마감일 — 채용 페이지가 줄 때만 (없으면 채용될 때까지) */
  closesAt?: string | null
  /** 화면에 보이는 출처 (기본 '회사 채용 페이지') */
  source?: JobSource
  /** ATS 가 준 경력 조건으로 정한 단계 — 제목에 단계가 없을 때 쓴다 */
  seniority?: CareerJob['seniority']
}

/* ── 본문 정리 ── */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  middot: '·',
  bull: '•',
  rarr: '→',
  times: '×',
}

export function decodeEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1))
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

/** HTML → 줄바꿈이 남은 평문. Greenhouse 본문은 한 번 더 이스케이프돼 있어 먼저 풀고 태그를 지운다 */
export function htmlToText(html: string) {
  const unescaped = /&lt;\w/.test(html) ? decodeEntities(html) : html
  return decodeEntities(
    unescaped
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/* 회사 소개 말고 직무 설명이 시작되는 제목 — 있으면 그 뒤부터 요약을 뽑는다 */
const ROLE_HEADINGS =
  /^(about (the|this) (role|position|team|opportunity)|the role|role overview|the opportunity|position overview|what you('|’)ll do|your role|overview|job description)\b.*$/im

/* 요약으로 쓰기에 알맞은 문단 — 회사 소개(회사 이름 · 링크로 시작) · 템플릿 안내문(괄호) · 짧은 제목 줄은 건너뛴다 */
const isRoleParagraph = (line: string, company: string) =>
  line.length >= 40 &&
  !/^[(\[]/.test(line) &&
  !/https?:\/\//.test(line) &&
  !(company && line.toLowerCase().startsWith(company.toLowerCase()))

/** 한두 문장 요약 (최대 160자) */
export function summarize(text: string, company = '', max = 160) {
  const heading = ROLE_HEADINGS.exec(text)
  const rest = heading ? text.slice(heading.index + heading[0].length) : text
  const lines = rest.split('\n').map((line) => line.replace(/^[\s\-–•*·:]+/, '').trim())
  const picked = lines.findIndex((line) => isRoleParagraph(line, company))
  const body = (picked >= 0 ? lines.slice(picked).join(' ') : rest)
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–•*·:]+/, '')
    .trim()
  if (body.length <= max) return body
  const cut = body.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('다. '))
  return end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

/* ── 직무 · 경력 ── 제목으로만 정한다 (본문은 회사 소개가 섞여 잘 틀린다). 위에서부터 먼저 맞는 것 */

const ROLE_RULES: [CareerRole, RegExp][] = [
  [
    'devrel',
    /developer relations|devrel|developer advocate|developer experience|solutions? engineer/i,
  ],
  ['design', /\bdesign(er|ers)?\b(?! engineer)|\bux\b|\bui\/ux\b/i],
  [
    'community',
    /community|marketing|growth|social media|content|brand|ambassador|partnerships?|business development|\bbd\b|\bgtm\b|go-to-market|events?\b/i,
  ],
  ['product', /product (manager|lead|owner|management)|head of product|\bpm\b|program manager/i],
  ['smart-contract', /smart[- ]contract|solidity|\bmove\b|blockchain engineer|on-?chain engineer/i],
  ['research', /research|analyst|economist|\bquant|data scien/i],
  // 제목에 프론트 · 백엔드가 적혀 있으면 'Platform' 같은 단어보다 먼저
  ['frontend', /front[- ]?end|full[- ]?stack|\bweb\b|\bui engineer|\bios\b|android|mobile/i],
  ['backend', /back[- ]?end/i],
  [
    'protocol',
    /protocol|infra(structure)?|\bnode\b|devops|\bsre\b|site reliability|platform|cryptograph|consensus|distributed|security engineer|\bzk\b|validator|\bdba\b|database/i,
  ],
  ['backend', /engineer|developer|\bdata\b/i],
]

/* 우리 직무 목록에 없는 일 — 법무 · 컴플라이언스 · 재무 · 인사 · 영업 지원 등은 올리지 않는다 */
const OUT_OF_SCOPE =
  /complian|legal|counsel|attorney|paralegal|account(ant|ing)|finance|financial|\btax\b|treasury|audit|recruit|talent|people|\bhr\b|human resources|payroll|executive assistant|office manager|customer (support|service)|\bkyc\b|\baml\b|risk control|investigat/i

/* 한국어 제목 — 한글에는 \b 가 걸리지 않아 따로 둔다. 순서는 영어 규칙과 같다 */
const KO_ROLE_RULES: [CareerRole, RegExp][] = [
  ['devrel', /데브렐|개발자 관계|솔루션 엔지니어/],
  ['design', /디자이너|디자인/],
  [
    'community',
    /마케팅|마케터|커뮤니티|그로스|콘텐츠|브랜드|사업개발|사업 개발|제휴|파트너십|홍보/,
  ],
  ['product', /프로덕트|기획|PO\b|PM\b|서비스 운영/],
  ['smart-contract', /스마트 ?컨트랙트|솔리디티|블록체인 (개발|엔지니어)/],
  ['research', /리서치|리서처|애널리스트|연구|데이터 ?(분석|사이언)/],
  ['frontend', /프론트|풀스택|웹 ?개발|모바일|iOS|안드로이드|앱 개발/],
  ['backend', /백엔드|서버/],
  ['protocol', /인프라|데브옵스|DevOps|SRE|플랫폼|보안|노드|블록체인/],
  ['backend', /개발|엔지니어|데이터/],
]

const KO_OUT_OF_SCOPE =
  /재무|회계|세무|자금|법무|준법|컴플라이언스|감사|인사|채용 담당|총무|고객 ?(센터|지원|상담)|CS|AML|자금세탁|리스크|비서|경영지원|인재풀/

const matchRole = (rules: [CareerRole, RegExp][], text: string) =>
  rules.find(([, pattern]) => pattern.test(text))?.[0] ?? null

export const classifyRole = (title: string, category = ''): CareerRole | null => {
  const both = `${title} ${category}`
  if (OUT_OF_SCOPE.test(both) || KO_OUT_OF_SCOPE.test(both)) return null
  return (
    matchRole(ROLE_RULES, title) ??
    matchRole(KO_ROLE_RULES, title) ??
    matchRole(ROLE_RULES, category) ??
    matchRole(KO_ROLE_RULES, category)
  )
}

export function classifySeniority(title: string): CareerJob['seniority'] {
  if (/\b(intern|internship|junior|jr\.?|entry|graduate|associate)\b/i.test(title)) return 'junior'
  if (/\b(lead|principal|head|director|vp|vice president|chief)\b/i.test(title)) return 'lead'
  if (/\b(senior|sr\.?|staff)\b/i.test(title)) return 'senior'
  if (/신입|인턴|주니어/.test(title)) return 'junior'
  if (/리드|팀장|헤드|파트장|실장|본부장/.test(title)) return 'lead'
  if (/시니어/.test(title)) return 'senior'
  return 'mid'
}

/* ── 스킬 · 체인 ── 본문에서 찾는다. 스킬 이름은 CAREER_SKILLS 안의 값만 쓴다 */

const SKILL_RULES: Record<(typeof CAREER_SKILLS)[number], RegExp> = {
  TypeScript: /typescript/i,
  React: /\breact(\.js)?\b(?! native)/i,
  'Next.js': /\bnext\.?js\b/i,
  'Node.js': /\bnode(\.js|js)\b/i,
  // 'Go to market' 같은 영어 문장과 헷갈리지 않게 대문자 Go 만, 뒤에 to 가 오면 뺀다
  Go: /\b[Gg]olang\b|\bGo\b(?![- ]to\b)(?=[\s,/)])/,
  Rust: /\bRust\b/,
  Python: /\bpython\b/i,
  Solidity: /\bsolidity\b/i,
  EVM: /\bEVM\b/,
  Foundry: /\bFoundry\b/,
  Hardhat: /\bhardhat\b/i,
  'viem/ethers': /\b(viem|ethers(\.js)?|wagmi|web3\.js)\b/i,
  Avalanche: /\bavalanche\b/i,
  'Cosmos SDK': /\bcosmos\b/i,
  Solana: /\bsolana\b/i,
  ZK: /\bzk|zero[- ]knowledge/i,
  DeFi: /\bdefi\b/i,
  Wallet: /\bwallets?\b/i,
  Indexer: /\bindexers?\b|subgraph/i,
  PostgreSQL: /\bpostgres(ql)?\b/i,
  Kubernetes: /\bkubernetes\b|\bk8s\b/i,
  Figma: /\bfigma\b/i,
  Product: /\bproduct (roadmap|strategy|requirements|discovery)\b|\bPRDs?\b/i,
  'Technical Writing': /technical writ|developer documentation/i,
  Community: /\bcommunity (management|manager|building|engagement|growth)\b/i,
  Korean: /\bkorean\b|한국어/i,
  English:
    /\b(fluent|fluency|proficien\w*|business[- ]level)\b[^.\n]{0,30}\benglish\b|\benglish\b[^.\n]{0,20}\b(fluen\w*|proficien\w*)/i,
}

/* 회사 소개에 흔히 나오는 단어는 한 번으로는 부족하다 — 두 번 이상 나와야 이 일의 스킬로 본다 */
const NEEDS_REPEAT = new Set<string>(['Wallet', 'DeFi'])

const countOf = (pattern: RegExp, text: string) =>
  text.match(
    new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  )?.length ?? 0

export const extractSkills = (text: string) =>
  CAREER_SKILLS.filter(
    (skill) => countOf(SKILL_RULES[skill], text) >= (NEEDS_REPEAT.has(skill) ? 2 : 1)
  )

const CHAIN_RULES: [string, RegExp][] = [
  ['Ethereum', /\bethereum\b/i],
  ['Bitcoin', /\bbitcoin\b/i],
  ['Solana', /\bsolana\b/i],
  ['Avalanche', /\bavalanche\b/i],
  ['Aptos', /\baptos\b/i],
  ['Sui', /\bSui\b/],
  ['Cosmos', /\bcosmos\b/i],
  ['Polygon', /\bpolygon\b/i],
  ['Arbitrum', /\barbitrum\b/i],
  ['XRP Ledger', /\bXRPL?\b|xrp ledger/i],
]

export function extractChains(text: string, fixed: string[] = []) {
  const found = CHAIN_RULES.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
  return [...new Set([...fixed, ...found])]
}

/* ── 한국에서 지원 가능한지 · 근무 형태 ── 위치 문자열로 정한다 */

const KOREA_OR_ASIA =
  /korea|seoul|한국|대한민국|서울|경기|판교|\bapac\b|asia|anywhere in the world/i
const GLOBAL = /\b(global|worldwide|anywhere)\b/i

export function classifyKoreaEligibility(location: string, title = ''): KoreaEligibility {
  if (KOREA_OR_ASIA.test(location)) return 'yes'
  // 'Remote Global (US, EU)' 처럼 괄호로 지역을 좁히면 그 지역만. 'Remote (Global)' 은 그대로 전 세계
  if (GLOBAL.test(location)) {
    const narrowed = [...location.matchAll(/\(([^)]*)\)/g)].some(
      ([, inside]) => inside.replace(/global|worldwide|anywhere|remote|[^a-z]/gi, '') !== ''
    )
    // 'remotely anywhere in the United States' 처럼 anywhere 뒤에 지역이 붙으면 그 지역만
    const anywhereIn = /anywhere in (?!the world)/i.test(location)
    return narrowed || anywhereIn ? 'no' : 'yes'
  }
  // 'Remote' 만 있고 지역이 없으면 — 제목에 다른 지역이 적혀 있으면 그 지역 공고, 아니면 본문을 봐야 안다
  const rest = location.replace(/remote|[^a-z가-힣]/gi, '')
  if (rest) return 'no'
  if (title && KOREA_OR_ASIA.test(title)) return 'yes'
  if (title && OTHER_REGION_IN_TITLE.test(title)) return 'no'
  return 'unclear'
}

const OTHER_REGION_IN_TITLE =
  /\b(MENA|EMEA|LATAM|AMER|NA|US|USA|U\.S\.|Europe|EU|UK|Canada|India|Africa|Saudi|Israel|Kenya|Cyprus|Brazil|Germany|France|Japan|Singapore|Hong Kong|Turkey|Nigeria|Dubai|UAE|Australia|Mexico|Argentina)\b/

/* 위치가 'Remote' 뿐이라 확인 필요가 된 공고는 본문의 거주 · 근무 국가 조건을 한 번 더 본다
   ('only open to candidates based in the US, EU and UK' 같은 문장) */
const RESIDENCY =
  /(only open to|open only to|must (be )?(based|located|reside|residing|live)|candidates (based|located|residing) in|(legally )?(authorized|eligible) to work in|residents of)\b([^.\n]{0,80})/gi

export function refineByBody(eligibility: KoreaEligibility, text: string): KoreaEligibility {
  if (eligibility !== 'unclear') return eligibility
  const scopes = [...text.matchAll(RESIDENCY)].map((match) => match[0])
  if (!scopes.length) return 'unclear'
  if (scopes.some((scope) => KOREA_OR_ASIA.test(scope) || GLOBAL.test(scope))) return 'yes'
  return scopes.some(
    (scope) =>
      OTHER_REGION_IN_TITLE.test(scope) || /united states|europe|canada|kingdom/i.test(scope)
  )
    ? 'no'
    : 'unclear'
}

/** 여러 곳이 겹쳐 적힌 위치를 한 번씩만, 너무 길면 앞 세 곳만 */
export function tidyLocation(location: string) {
  const parts = [
    ...new Set(
      location
        .split(/;\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ]
  return parts.length > 3
    ? `${parts.slice(0, 3).join('; ')} 외 ${parts.length - 3}곳`
    : parts.join('; ')
}

/* ── 화면에 보이는 위치 — 장소만 한국어로. 원격 · 하이브리드 같은 근무 방식은 '근무' 칸에 따로 보이므로 뺀다 ── */

const GLOBAL_PLACE =
  /^(global|worldwide|anywhere|anywhere in the world|international|no geographical restrictions|work from anywhere|전 세계|전세계)$/i

const PLACE_KO: [RegExp, string][] = [
  [/^(apac|asia[ -]pacific|asia pac)$/i, '아시아·태평양'],
  [/^northeast asia$/i, '동북아시아'],
  [/^southeast asia$/i, '동남아시아'],
  [/^(asia|asian)$/i, '아시아'],
  [/^emea$/i, '유럽·중동·아프리카'],
  [/^(europe|eu)$/i, '유럽'],
  [/^(mena|middle east)$/i, '중동'],
  [/^(latam|latin america)$/i, '중남미'],
  [/^(north america|amer|americas)$/i, '북미'],
  [/^(united states|united states of america|usa|us|u\.s\.)$/i, '미국'],
  [/^(united kingdom|uk)$/i, '영국'],
  [/^canada$/i, '캐나다'],
  [/^(south korea|korea|republic of korea|대한민국|한국)$/i, '한국'],
  [/^seoul$/i, '서울'],
  [/^(pangyo|seongnam)$/i, '성남'],
  [/^singapore$/i, '싱가포르'],
  [/^hong kong$/i, '홍콩'],
  [/^japan$/i, '일본'],
  [/^tokyo$/i, '도쿄'],
  [/^(taiwan|taipei)$/i, '대만'],
  [/^(dubai|uae|united arab emirates)$/i, '두바이'],
  [/^(australia|oceania)$/i, '오세아니아'],
  [/^india$/i, '인도'],
  [/^philippines$/i, '필리핀'],
  [/^(vietnam|viet nam)$/i, '베트남'],
  [/^thailand$/i, '태국'],
  [/^indonesia$/i, '인도네시아'],
  [/^(malaysia|kuala lumpur)$/i, '말레이시아'],
  [/^mexico$/i, '멕시코'],
  [/^(brazil)$/i, '브라질'],
  [/^(portugal|lisbon)$/i, '포르투갈'],
  [/^(spain|madrid|barcelona)$/i, '스페인'],
  [/^(netherlands|amsterdam)$/i, '네덜란드'],
  [/^(ireland|dublin)$/i, '아일랜드'],
  [/^(israel|tel aviv)$/i, '이스라엘'],
  [/^(turkey|istanbul)$/i, '튀르키예'],
  [/^(nigeria|lagos)$/i, '나이지리아'],
  [/^(kenya|nairobi)$/i, '케냐'],
  [/^(germany|berlin)$/i, '독일'],
  [/^(france|paris)$/i, '프랑스'],
  [/^(switzerland|zug|zurich)$/i, '스위스'],
  [/^(london)$/i, '런던'],
  [/^(new york|new york city|nyc|ny|brooklyn)$/i, '뉴욕'],
  [/^(san francisco|sf|bay area)$/i, '샌프란시스코'],
]

const SEOUL_GU: Record<string, string> = {
  'gangnam-gu': '강남구',
  'seocho-gu': '서초구',
  'yeongdeungpo-gu': '영등포구',
  'jung-gu': '중구',
  'mapo-gu': '마포구',
  'songpa-gu': '송파구',
  'seongdong-gu': '성동구',
  'jongno-gu': '종로구',
  'yongsan-gu': '용산구',
}

/** 근무 방식 · 군더더기 말 — 지우고 남은 것이 장소 */
const NOT_PLACE =
  /\b(100%|fully|remote[- ]?first|remotely|remote|hybrid|on-?site|in-?office|office|based|can be done|work(ing)?|from|with|preference|preferred|time ?zones?|tz|only|flexible|locations?|multiple|region|or|and|in|the|within|a|an)\b|원격|재택|하이브리드|근무|가능/gi

function placeOf(input: string): string | null {
  let part = input
  const gu = /^seoul\s+([a-z]+-gu)$/i.exec(part)
  if (gu) return `서울 ${SEOUL_GU[gu[1].toLowerCase()] ?? gu[1]}`
  if (/[가-힣]/.test(part) && !/원격|재택|하이브리드/.test(part)) {
    for (const [pattern, ko] of PLACE_KO) if (pattern.test(part)) return ko
    return part
  }
  if (GLOBAL_PLACE.test(part)) return '전 세계'
  // 'anywhere in APAC' 은 전 세계가 아니라 APAC
  if (/no geographical/i.test(part) || /anywhere(?! in (?!the world))/i.test(part)) return '전 세계'
  part = part.replace(/anywhere in/gi, ' ')
  const rest = part
    .replace(NOT_PLACE, ' ')
    .replace(/[^A-Za-z.\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!rest) return null
  if (GLOBAL_PLACE.test(rest)) return '전 세계'
  for (const [pattern, ko] of PLACE_KO) if (pattern.test(rest)) return ko
  // 대문자로 시작하는 고유명사만 장소로 (문장 조각은 버린다)
  return /^[A-Z][A-Za-z.'-]*( [A-Z][A-Za-z.'-]*){0,2}$/.test(rest) ? rest : null
}

/** 'Remote - APAC' → '아시아·태평양', '100% remote with no geographical restrictions…' → '전 세계',
    'Seoul, South Korea' → '서울', 'Remote' → '' (장소가 없으면 빈 문자열) */
export function displayLocation(location: string) {
  const parts = location
    .replace(/\s+외 \d+곳$/, '')
    // 'excluding Russia and Belarus' 같은 제외 지역은 장소가 아니다
    .replace(/,?\s*\b(excluding|except)\b[^;/]*/gi, '')
    .split(/\s*(?:;|\/|,|·|\(|\)|\.|\s-\s|\s–\s|\bor\b|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean)
  const places = [...new Set(parts.map(placeOf).filter((place): place is string => !!place))]
  // 서울 · 성남이 있으면 '한국'은 겹치므로 뺀다
  const korean = places.some((place) => /^(서울|성남|[가-힣]+ [가-힣]+구)/.test(place))
  const list = places.filter((place) => !(korean && place === '한국'))
  return list.length > 3
    ? `${list.slice(0, 3).join(' · ')} 외 ${list.length - 3}곳`
    : list.join(' · ')
}

/* ── 고용 형태 — 채용 페이지 값이 먼저, 없으면 제목, 그다음 본문의 'full-time position' 같은 문장 ── */
function employmentOf(value: string): EmploymentType | null {
  if (/intern/i.test(value) || /인턴/.test(value)) return 'intern'
  if (/part[\s_-]?time|파트/i.test(value)) return 'parttime'
  if (/contract|temporary|freelance|계약/i.test(value)) return 'contract'
  if (/full[\s_-]?time|permanent|정규/i.test(value)) return 'fulltime'
  return null
}

export function classifyEmployment(value: string | null | undefined, title: string, text = '') {
  const given = value ? employmentOf(value) : null
  if (given) return given
  if (/\bintern(ship)?\b|인턴/i.test(title)) return 'intern'
  if (/\bcontract(or)?\b|\bfreelance\b|계약직/i.test(title)) return 'contract'
  if (/\bpart[- ]time\b/i.test(title)) return 'parttime'
  const sentence =
    /\b(full[- ]time|part[- ]time|contract|internship)\s+(position|role|job|opportunity)\b/i.exec(
      text
    )
  return sentence ? employmentOf(sentence[1]) : null
}

/* ── 마감일 — 대부분의 채용 페이지는 마감일을 주지 않는다(채용될 때까지). 있을 때만 'YYYY-MM-DD' ── */
export const toDay = (value: string | null | undefined) =>
  value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString().slice(0, 10) : null

export function classifyWorkMode(
  location: string,
  isRemote: boolean | null,
  workplace: WorkMode | null
): WorkMode {
  if (workplace) return workplace
  if (/hybrid|하이브리드/i.test(location)) return 'hybrid'
  if (isRemote || /remote|anywhere|원격|재택/i.test(location)) return 'remote'
  return 'onsite'
}

/* ── 연봉 ── ATS 가 구조화해서 주지 않으면 본문의 연봉 범위를 찾는다 (미국 급여 공개법 문구).
   시급 · 월급처럼 연봉이 아닌 금액은 너무 작아서 걸러진다 */

const USD_RANGE =
  /\$\s?(\d{2,3}(?:,\d{3})+|\d{2,3}(?:\.\d+)?\s?[kK])\s*(?:USD)?\s*(?:-|–|—|to)\s*\$?\s?(\d{2,3}(?:,\d{3})+|\d{2,3}(?:\.\d+)?\s?[kK])/

const toNumber = (value: string) =>
  /k$/i.test(value.trim())
    ? Math.round(parseFloat(value) * 1000)
    : Number(value.replace(/[,\s]/g, ''))

export function parseSalary(text: string): CareerJob['salary'] {
  const match = USD_RANGE.exec(text)
  if (!match) return null
  const min = toNumber(match[1])
  const max = toNumber(match[2])
  if (min < 20_000 || max < min || max > 2_000_000) return null
  return { min, max, currency: 'USD' }
}

/* ── 원문 → 화면용 공고 ── 직무를 정하지 못하면 null (화면에 올리지 않는다) */

export function toCareerJob(raw: RawPosting, fetchedAt: string): CareerJob | null {
  const role = classifyRole(raw.title, raw.category)
  if (!role) return null
  const text = raw.text
  return {
    id: `${raw.ats}-${raw.board}-${raw.id}`,
    title: raw.title.trim(),
    company: raw.company,
    summary: summarize(text, raw.company),
    role,
    seniority:
      classifySeniority(raw.title) === 'mid' && raw.seniority
        ? raw.seniority
        : classifySeniority(raw.title),
    workMode: classifyWorkMode(raw.location, raw.isRemote, raw.workplace),
    employment: classifyEmployment(raw.employment, raw.title, raw.text),
    koreaEligible: refineByBody(classifyKoreaEligibility(raw.location, raw.title), text),
    location: displayLocation(tidyLocation(raw.location)),
    salary: raw.salary ?? parseSalary(text),
    skills: extractSkills(text),
    chains: extractChains(text, raw.chains),
    source: raw.source ?? 'company',
    sourceUrl: raw.url,
    postedAt: raw.postedAt.slice(0, 10),
    closesAt: toDay(raw.closesAt),
    fetchedAt,
  }
}

const companyKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|co|corp|labs?|foundation|technologies)\b/g, '')
    .replace(/[^a-z0-9가-힣]/g, '')

/** 같은 공고는 하나만 — 같은 링크이거나, 같은 회사의 같은 제목.
    앞에 있는 것을 남기므로 회사 원문(ATS)을 잡보드보다 먼저 넣는다 */
export function dedupeJobs(jobs: CareerJob[]) {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const keys = [`${companyKey(job.company)}|${job.title.toLowerCase().replace(/\s+/g, ' ')}`]
    if (job.sourceUrl) keys.push(job.sourceUrl.replace(/[?#].*$/, '').replace(/\/$/, ''))
    if (keys.some((key) => seen.has(key))) return false
    keys.forEach((key) => seen.add(key))
    return true
  })
}

/** 한 회사의 공고 여럿에 똑같이 들어 있는 문단(회사 소개 · 복지 · 법적 고지)을 지운다.
    공고가 셋 이상이고, 그중 절반 이상에 같은 줄이 있으면 회사 공통 문구로 본다 */
export function stripBoilerplate(postings: RawPosting[]): RawPosting[] {
  if (postings.length < 3) return postings
  const seen = new Map<string, number>()
  for (const posting of postings)
    for (const line of new Set(posting.text.split('\n').map((l) => l.trim())))
      if (line.length >= 40) seen.set(line, (seen.get(line) ?? 0) + 1)
  const threshold = Math.max(3, Math.ceil(postings.length / 2))
  return postings.map((posting) => ({
    ...posting,
    text: posting.text
      .split('\n')
      .filter((line) => (seen.get(line.trim()) ?? 0) < threshold)
      .join('\n'),
  }))
}

/* ── 잡보드 · 모음 서비스에서 받은 공고 ── */

/** 공고 링크가 회사 ATS 면 그 보드를 알려 준다 — 잡보드에서 회사 목록을 넓힐 때 쓴다 */
export function atsBoardFromUrl(
  url: string
): { ats: 'greenhouse' | 'lever' | 'ashby'; board: string } | null {
  const greenhouse =
    /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_app\?for=)?([a-z0-9_-]+)/i.exec(
      url
    )
  if (greenhouse && greenhouse[1] !== 'embed')
    return { ats: 'greenhouse', board: greenhouse[1].toLowerCase() }
  const lever = /jobs\.lever\.co\/([a-z0-9_.-]+)/i.exec(url)
  if (lever) return { ats: 'lever', board: lever[1].toLowerCase() }
  const ashby = /jobs\.ashbyhq\.com\/([^/?#]+)/i.exec(url)
  if (ashby) return { ats: 'ashby', board: decodeURIComponent(ashby[1]) }
  return null
}

/** '서울특별시 강남구 테헤란로 129 …' → '서울 강남구' (주소가 아니면 그대로) */
export function shortKoreanAddress(location: string) {
  const match =
    /(서울|부산|인천|대구|대전|광주|울산|세종|경기|제주)[가-힣]*\s+([가-힣]+(?:구|시|군))/.exec(
      location
    )
  if (match) return `${match[1]} ${match[2]}`
  // 영문 주소 'Seoul, Gangnam-gu, Teheran-ro 124 …' → 'Seoul Gangnam-gu'
  const gu = /\b([A-Z][a-z]+-gu)\b/.exec(location)
  if (gu && /seoul/i.test(location)) return `Seoul ${gu[1]}`
  return location
}

export interface RssItem {
  title: string
  link: string
  description: string
  creator: string
  location: string
  pubDate: string
}

const tag = (xml: string, name: string) => {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)
  return (match?.[1] ?? '').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim()
}

/** RSS 의 item 들을 읽는다 (잡보드 피드에 필요한 태그만) */
export function parseRssItems(xml: string): RssItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    title: decodeEntities(tag(item, 'title')),
    link: tag(item, 'link'),
    description: tag(item, 'description'),
    creator: decodeEntities(tag(item, 'dc:creator')),
    location: decodeEntities(tag(item, 'media:location')),
    pubDate: tag(item, 'pubDate'),
  }))
}

/** 'Backend Developer at RedStone' → ['Backend Developer', 'RedStone'] */
export function splitTitleAtCompany(title: string): [string, string] {
  const at = title.lastIndexOf(' at ')
  return at > 0 ? [title.slice(0, at).trim(), title.slice(at + 4).trim()] : [title, '']
}

/** CryptocurrencyJobs 설명 문장에서 위치만 —
    'This is a full-time position that can be done remotely anywhere in Europe or on-site in Warsaw.'
    → 'remotely anywhere in Europe or on-site in Warsaw' */
export function locationFromSentence(description: string) {
  const match = /position that (?:can be done |is |can be )?(.*?)\.?$/i.exec(description.trim())
  return (match?.[1] ?? '').replace(/^based in /i, '').trim()
}

/** JobStash 의 경력 1~5 (인턴 · 주니어 · 미드 · 시니어 · 리드) */
export const jobStashSeniority = (value: string | null): CareerJob['seniority'] | undefined =>
  value === '1' || value === '2'
    ? 'junior'
    : value === '4'
      ? 'senior'
      : value === '5'
        ? 'lead'
        : undefined
