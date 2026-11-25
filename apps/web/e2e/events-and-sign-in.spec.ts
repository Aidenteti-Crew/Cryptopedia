import { expect, test, type Page } from '@playwright/test'

// Event data and API answers are fixed here, so the flow never touches the shared database or a
// running API. Dates are relative to now so the events are always upcoming.
const DAY = 86_400_000
const at = (days: number, hourKst: number) => {
  const d = new Date(Date.now() + days * DAY)
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d)
  return `${ymd}T${String(hourKst).padStart(2, '0')}:00:00+09:00`
}

function event(id: string, title: string, startsAt: string, extra: Record<string, unknown> = {}) {
  return {
    id, title, summary: '', startsAt, endsAt: null, timezone: 'Asia/Seoul', allDay: false,
    status: 'UPCOMING', organizer: '한국인터넷진흥원(KISA)', venueName: 'KISA 서울청사', venueAddress: '서울 송파구 중대로 135',
    city: '서울', country: 'KR', isOnline: false, sourceUrl: `https://www.kisa.or.kr/401/form?postSeq=${id}`,
    registrationUrl: `https://event-us.kr/m/${id}`, imageUrl: null, category: 'EDUCATION', tags: [], chain: 'web3-kr',
    project: null, publishedAt: null, fetchedAt: new Date().toISOString(), confidence: 0.9,
    registrationDeadline: null, registrationStatus: 'UNKNOWN', daysUntilDeadline: null, audience: [], level: null,
    fee: null, relatedChains: [], scope: 'web3-kr', ...extra,
  }
}

const UPCOMING = [
  event('3787', '블록체인 밋업데이 31회차', at(3, 10), { registrationStatus: 'CLOSING_SOON', daysUntilDeadline: 2 }),
  event('3790', '블록체인 밋업데이 32회차', at(10, 10), { registrationStatus: 'OPEN', daysUntilDeadline: 9 }),
  event('3781', '2026 블록체인 진흥주간', at(14, 0), {
    allDay: true, venueName: '코엑스 컨퍼런스룸 E(3층)', summary: '국내 블록체인 산업을 키우려고 정부가 여는 연례 행사예요.',
  }),
  event('luma-run', 'Web3 Run for Good', at(16, 19), {
    organizer: 'Team1 Korea', chain: 'avalanche', scope: 'avalanche', registrationUrl: null, sourceUrl: 'https://luma.com/team1',
  }),
]

async function fixData(page: Page) {
  await page.route('**/cryptopedia/live/events-*.json', (route) => {
    const upcoming = route.request().url().includes('events-upcoming')
    return route.fulfill({ json: { items: upcoming ? UPCOMING : [], nextCursor: null, generatedAt: new Date().toISOString() } })
  })
  await page.route('**/api/app-user/signin', (route) => route.fulfill({ status: 201, json: { expiresAt: new Date(Date.now() + 900_000).toISOString() } }))
  await page.route('**/api/app-user/logout', (route) => route.fulfill({ status: 200, body: '' }))
  await page.route('**/api/app-user/refresh', (route) => route.fulfill({ status: 401, json: {} }))
  // Without this a real API on :4000 rejects the fake token and the account page bounces to /login.
  await page.route('**/api/app-user/me', (route) =>
    route.fulfill({ json: { id: 'u1', email: 'tester@example.com', hasPassword: true } })
  )
}

test('events: the menu opens the calendar; the list view opens a detail, moves between events, and closes', async ({ page }) => {
  await fixData(page)
  await page.goto('/')
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '행사/이벤트' }).click()
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByLabel(/년 \d+월 달력$/)).toBeVisible()
  await expect(page.getByRole('button', { name: '달력' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: '리스트' }).click()
  const cards = page.locator('article')
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(0)).toContainText('마감 임박 D-2')
  await expect(cards.nth(1)).toContainText('모집중')
  await expect(cards.nth(3)).toContainText('Avalanche')

  await page.getByRole('link', { name: '2026 블록체인 진흥주간' }).click()
  await expect(page).toHaveURL(/\/events\?event=3781$/)
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('article').getByRole('heading', { name: '2026 블록체인 진흥주간' })).toBeVisible()
  await expect(panel).toContainText('종일 · 한국시간')
  await expect(panel).toContainText('코엑스 컨퍼런스룸 E(3층)')
  await expect(panel.getByRole('link', { name: '공식 페이지에서 신청' })).toHaveAttribute('href', 'https://event-us.kr/m/3781')

  await panel.getByRole('button', { name: '링크 복사' }).click()
  await expect(panel.getByRole('button', { name: '복사했어요' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/events\?event=3781$/)

  await panel.getByRole('button', { name: '다음 행사' }).click()
  await expect(panel.getByRole('article').getByRole('heading', { name: 'Web3 Run for Good' })).toBeVisible()
  // Luma has no separate sign-up link: its event page is where people register
  await expect(panel.getByRole('link', { name: '공식 페이지에서 신청' })).toHaveAttribute('href', 'https://luma.com/team1')
  await expect(panel.getByRole('button', { name: '다음 행사' })).toBeDisabled()
  await panel.getByRole('button', { name: '이전 행사' }).click()
  await expect(panel.getByRole('article').getByRole('heading', { name: '2026 블록체인 진흥주간' })).toBeVisible()

  await panel.getByRole('button', { name: '상세 닫기' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/events$/)
})

const ymd = (days: number) => at(days, 0).slice(0, 10)

// Pages the calendar to the month of an event (the fixtures are at most a month ahead) and selects its day.
async function showDay(page: Page, days: number) {
  const [year, month, date] = ymd(days).split('-').map(Number)
  const shown = (await page.getByLabel(/년 \d+월 달력$/).getAttribute('aria-label'))!.match(/(\d+)년 (\d+)월/)!
  const behind = (year - Number(shown[1])) * 12 + (month - Number(shown[2]))
  for (let step = 0; step < Math.abs(behind); step++) {
    await page.getByRole('button', { name: behind > 0 ? '다음 달' : '이전 달' }).click()
  }
  const cell = page.getByRole('button', { name: new RegExp(`^${month}월 ${date}일, `) })
  await cell.click()
  await expect(cell).toHaveAttribute('aria-pressed', 'true')
}

test('events: filter by chain, save with the heart, keep it after a reload, and look at saved ones only', async ({ page }) => {
  await fixData(page)
  await page.goto('/events')
  const meetup = page.locator('article', { hasText: '블록체인 밋업데이 31회차' })
  const noEvents = page.getByText('이 날은 예정된 행사가 없어요.')

  await showDay(page, 3)
  await expect(meetup).toBeVisible()

  const all = page.getByRole('button', { name: '전체', exact: true })
  const avalanche = page.getByRole('button', { name: 'Avalanche 1건' })
  const web3Kr = page.getByRole('button', { name: '국내 Web3 3건' })
  await expect(all).toHaveAttribute('aria-pressed', 'true')

  await avalanche.click()
  await expect(avalanche).toHaveAttribute('aria-pressed', 'true')
  await expect(all).toHaveAttribute('aria-pressed', 'false')
  await expect(meetup).toHaveCount(0)
  await expect(noEvents).toBeVisible()
  await showDay(page, 16)
  await expect(page.locator('article', { hasText: 'Web3 Run for Good' })).toBeVisible()

  await avalanche.click()
  await expect(avalanche).toHaveAttribute('aria-pressed', 'false')
  await expect(all).toHaveAttribute('aria-pressed', 'true')

  await web3Kr.click()
  await expect(page.locator('article')).toHaveCount(0)
  await showDay(page, 3)
  await expect(meetup).toBeVisible()
  await all.click()
  await expect(web3Kr).toHaveAttribute('aria-pressed', 'false')
  await expect(all).toHaveAttribute('aria-pressed', 'true')

  await meetup.getByRole('button', { name: '관심 행사에 추가' }).click()
  await expect(meetup.getByRole('button', { name: '관심 행사에서 빼기' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /관심 행사만/ })).toHaveText('관심 행사만 (1)')
  await expect(page).toHaveURL(/\/events$/)

  await page.reload()
  await expect(page.getByRole('button', { name: /관심 행사만/ })).toHaveText('관심 행사만 (1)')
  await showDay(page, 3)
  await expect(meetup.getByRole('button', { name: '관심 행사에서 빼기' })).toBeVisible()

  const savedOnly = page.getByRole('button', { name: /관심 행사만/ })
  await savedOnly.click()
  await expect(savedOnly).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-occupied="true"]')).toHaveCount(1)

  await page.getByRole('button', { name: '리스트' }).click()
  await expect(page.locator('article')).toHaveCount(1)
  await page.getByRole('link', { name: '블록체인 밋업데이 31회차' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByRole('button', { name: '관심 행사에서 빼기' }).click()
  await expect(panel.getByRole('button', { name: '관심 행사에 추가' })).toBeVisible()
  await panel.getByRole('button', { name: '상세 닫기' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(savedOnly).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '리스트' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('아직 담은 관심 행사가 없어요.')).toBeVisible()
})

test('a copied event link opens the detail directly', async ({ page }) => {
  await fixData(page)
  await page.goto('/events?event=3790')
  await expect(page.getByRole('dialog').getByRole('article').getByRole('heading', { name: '블록체인 밋업데이 32회차' })).toBeVisible()
})

test('sign-in: e-mail link request, signed-in header, account page, sign-out', async ({ page }) => {
  await fixData(page)
  await page.goto('/events')
  await page.getByRole('banner').getByRole('link', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/login\?next=%2Fevents$/)

  await page.getByRole('button', { name: '이메일 링크로 로그인' }).click()
  const linkForm = page.locator('form', { has: page.getByRole('button', { name: '로그인 링크 받기' }) })
  const submit = linkForm.getByRole('button', { name: '로그인 링크 받기' })
  await linkForm.getByLabel('이메일').fill('tester@example')
  await expect(submit).toBeDisabled()
  await linkForm.getByLabel('이메일').fill('tester@example.com')
  await expect(submit).toBeEnabled()
  const signin = page.waitForRequest('**/api/app-user/signin')
  await submit.click()
  expect((await signin).postDataJSON()).toEqual({ email: 'tester@example.com', from: 'main' })
  await expect(page.getByText('tester@example.com로 로그인 링크를 보냈어요')).toBeVisible()
  await expect(page.getByRole('button', { name: /초 뒤 다시 보낼 수 있어요/ })).toBeDisabled()

  // Signed in: the access token the API would set after the link is clicked (unsigned, UI only).
  await page.evaluate(() => {
    const b64 = (o: object) => btoa(JSON.stringify(o))
    const exp = Math.floor(Date.now() / 1000) + 3600
    localStorage.setItem('accessToken', `${b64({ alg: 'none' })}.${b64({ id: 'u1', email: 'tester@example.com', exp })}.x`)
  })
  await page.goto('/events')
  const account = page.getByRole('button', { name: '내 계정 메뉴' })
  await expect(account).toHaveText('T')
  await account.click()
  await page.getByRole('menuitem', { name: '내 계정' }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByText('tester@example.com')).toBeVisible()

  await page.getByRole('main').getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByText('로그인하면 계정을 관리할 수 있어요')).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', { name: '로그인' })).toBeVisible()
})

// An unsigned access token the way the API would hand one out: enough for the UI, never trusted.
const signedInToken = (extra: Record<string, unknown> = {}) =>
  ['{"alg":"none"}', JSON.stringify({ id: 'u1', email: 'tester@example.com', exp: Math.floor(Date.now() / 1000) + 3600, ...extra }), 'x']
    .map((part, index) => (index === 2 ? part : Buffer.from(part).toString('base64')))
    .join('.')

test('password sign-in: sends the e-mail and password, then returns to the page the person came from', async ({ page }) => {
  await fixData(page)
  await page.route('**/api/app-user/password/login', (route) =>
    route.fulfill({ status: 201, json: { accessToken: signedInToken(), user: { id: 'u1', email: 'tester@example.com' } } })
  )
  await page.goto('/login?next=%2Fevents')
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()

  const login = page.getByRole('button', { name: '로그인', exact: true })
  await expect(login).toBeDisabled()
  await page.getByLabel('이메일').fill('tester@example.com')
  await page.getByLabel('비밀번호').fill('correct horse 9')
  await expect(login).toBeEnabled()

  const request = page.waitForRequest('**/api/app-user/password/login')
  await login.click()
  expect((await request).postDataJSON()).toEqual({ email: 'tester@example.com', password: 'correct horse 9' })
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('button', { name: '내 계정 메뉴' })).toHaveText('T')
})

test('password sign-in: a wrong password shows one message and clears the field', async ({ page }) => {
  await fixData(page)
  await page.route('**/api/app-user/password/login', (route) => route.fulfill({ status: 401, json: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }))
  await page.goto('/login')
  await page.getByLabel('이메일').fill('tester@example.com')
  await page.getByLabel('비밀번호').fill('not the one 1')
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  await expect(page.getByText('이메일이나 비밀번호가 맞지 않아요.')).toBeVisible()
  await expect(page.getByText('Invalid email or password.')).toHaveCount(0)
  await expect(page.getByLabel('비밀번호')).toHaveValue('')
  await expect(page).toHaveURL(/\/login$/)

  await page.route('**/api/app-user/password/login', (route) => route.fulfill({ status: 429, json: { code: 'RATE_LIMITED_AUTH' } }))
  await page.getByLabel('비밀번호').fill('not the one 1')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByText('시도가 너무 많아요. 1분 뒤에 다시 해 주세요.')).toBeVisible()
})

test('password sign-up: switch from login, give only the e-mail, and get a sign-up link', async ({ page }) => {
  await fixData(page)
  await page.goto('/login')
  await page.getByRole('button', { name: '회원가입' }).click()
  await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible()
  await expect(page.getByText('메일로 온 버튼을 누르면 가입이 끝나요. 비밀번호는 그다음에 정해요.')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)

  const join = page.getByRole('button', { name: '가입 메일 받기' })
  await page.getByLabel('이메일').first().fill('new@example')
  await expect(join).toBeDisabled()
  await page.getByLabel('이메일').first().fill(' new@example.com ')
  await expect(join).toBeEnabled()

  const request = page.waitForRequest('**/api/app-user/signin')
  await join.click()
  expect((await request).postDataJSON()).toEqual({ email: 'new@example.com', from: 'main', intent: 'signup' })
  await expect(page.getByRole('heading', { name: '메일을 확인하세요' })).toBeVisible()
  await expect(page.getByText('new@example.com로 가입 확인 메일을 보냈어요.')).toBeVisible()

  await page.getByRole('button', { name: '로그인으로 돌아가기' }).click()
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
})

// Sign up from /login?next=/events, then open the mail's button (/login?email=&token=&intent=signup)
// in the same browser. The API is mocked, so the token is fake.
async function landFromSignupMail(page: Page, me: { hasPassword: boolean }) {
  await fixData(page)
  const exchanges: unknown[] = []
  await page.route('**/api/app-user/login', (route) => {
    exchanges.push(route.request().postDataJSON())
    return route.fulfill({
      status: 201,
      json: { accessToken: signedInToken({ amr: 'link', tokenType: 'access', authAt: Math.floor(Date.now() / 1000) }), user: { id: 'u1', email: 'new@example.com' } },
    })
  })
  await page.route('**/api/app-user/me', (route) => route.fulfill({ json: { id: 'u1', email: 'new@example.com', ...me } }))
  await page.goto('/login?next=%2Fevents')
  await page.getByRole('button', { name: '회원가입' }).click()
  await page.getByLabel('이메일').first().fill('new@example.com')
  await page.getByRole('button', { name: '가입 메일 받기' }).click()
  await expect(page.getByRole('heading', { name: '메일을 확인하세요' })).toBeVisible()
  await page.goto('/login?email=new%40example.com&token=abc123&intent=signup')
  return exchanges
}

test('sign-up link: a new account sets a password and then goes on to the page it came from', async ({ page }) => {
  const exchanges = await landFromSignupMail(page, { hasPassword: false })
  await page.route('**/api/app-user/password', (route) =>
    route.fulfill({ status: 200, json: { accessToken: signedInToken({ amr: 'link' }), hasPassword: true } })
  )
  await expect(page.getByRole('heading', { name: '비밀번호 정하기' })).toBeVisible()
  expect(exchanges).toEqual([{ email: 'new@example.com', signInToken: 'abc123' }])
  await expect(page.getByText('8자 이상이고, 문자와 숫자를 하나씩은 넣어 주세요.')).toBeVisible()

  const save = page.getByRole('button', { name: '비밀번호 정하기' })
  await expect(save).toBeDisabled()
  await page.getByLabel('새 비밀번호').fill('abcdefg1')
  await page.getByLabel('비밀번호 확인').fill('abcdefg2')
  await expect(page.getByText('비밀번호가 서로 달라요.')).toBeVisible()
  await page.getByLabel('비밀번호 확인').fill('abcdefg1')
  await expect(save).toBeEnabled()

  const request = page.waitForRequest('**/api/app-user/password')
  await save.click()
  expect((await request).postDataJSON()).toEqual({ password: 'abcdefg1' })
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('button', { name: '내 계정 메뉴' })).toBeVisible()
})

test('sign-up link: 나중에 할게요 goes on without a password', async ({ page }) => {
  await landFromSignupMail(page, { hasPassword: false })
  let passwordCalls = 0
  await page.route('**/api/app-user/password', (route) => {
    passwordCalls += 1
    return route.fulfill({ status: 500, json: {} })
  })
  await page.getByRole('button', { name: '나중에 할게요' }).click()
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('button', { name: '내 계정 메뉴' })).toBeVisible()
  expect(passwordCalls).toBe(0)
})

test('sign-up link: an account that already has a password signs in without the step', async ({ page }) => {
  await landFromSignupMail(page, { hasPassword: true })
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('heading', { name: '비밀번호 정하기' })).toHaveCount(0)
})

test('account: a member with no password sets one, and the page then offers to change it', async ({ page }) => {
  await fixData(page)
  await page.route('**/api/app-user/me', (route) => route.fulfill({ json: { id: 'u1', email: 'tester@example.com', hasPassword: false } }))
  await page.route('**/api/app-user/password', (route) => route.fulfill({ status: 200, json: { accessToken: signedInToken({ amr: 'google' }), hasPassword: true } }))
  await page.addInitScript((token) => localStorage.setItem('accessToken', token), signedInToken({ amr: 'google' }))
  await page.goto('/account')

  const section = page.getByRole('region', { name: '비밀번호' })
  await expect(section.getByRole('button', { name: '비밀번호 정하기' })).toBeDisabled()
  await expect(section.getByLabel('현재 비밀번호')).toHaveCount(0)
  await section.getByLabel('새 비밀번호', { exact: true }).fill('abcdefg1')
  await section.getByLabel('새 비밀번호 확인').fill('abcdefg1')

  const request = page.waitForRequest('**/api/app-user/password')
  await section.getByRole('button', { name: '비밀번호 정하기' }).click()
  expect((await request).postDataJSON()).toEqual({ password: 'abcdefg1' })
  await expect(section.getByText('비밀번호를 정했어요.')).toBeVisible()
  await expect(section.getByRole('button', { name: '비밀번호 바꾸기' })).toBeVisible()
  await expect(section.getByLabel('현재 비밀번호')).toBeVisible()
})

test('account: after a wrong current password, fixing only that field changes the password', async ({ page }) => {
  await fixData(page)
  await page.route('**/api/app-user/me', (route) => route.fulfill({ json: { id: 'u1', email: 'tester@example.com', hasPassword: true } }))
  const sent: unknown[] = []
  await page.route('**/api/app-user/password', (route) => {
    const body = route.request().postDataJSON() as { currentPassword?: string }
    sent.push(body)
    return body.currentPassword === 'right-pass1'
      ? route.fulfill({ status: 200, json: { accessToken: signedInToken({ amr: 'password' }), hasPassword: true } })
      : route.fulfill({ status: 403, json: { code: 'CURRENT_PASSWORD_WRONG' } })
  })
  await page.addInitScript((token) => localStorage.setItem('accessToken', token), signedInToken({ amr: 'password' }))
  await page.goto('/account')

  const section = page.getByRole('region', { name: '비밀번호' })
  await section.getByLabel('현재 비밀번호').fill('wrong-pass1')
  await section.getByLabel('새 비밀번호', { exact: true }).fill('abcdefg1')
  await section.getByLabel('새 비밀번호 확인').fill('abcdefg1')
  await section.getByRole('button', { name: '비밀번호 바꾸기' }).click()
  await expect(section.getByText('현재 비밀번호가 맞지 않아요.')).toBeVisible()
  await expect(section.getByLabel('새 비밀번호', { exact: true })).toHaveValue('abcdefg1')

  await section.getByLabel('현재 비밀번호').fill('right-pass1')
  await expect(section.getByText('현재 비밀번호가 맞지 않아요.')).toHaveCount(0)
  await section.getByRole('button', { name: '비밀번호 바꾸기' }).click()
  await expect(section.getByText('비밀번호를 바꿨어요.')).toBeVisible()
  expect(sent).toHaveLength(2)
  await expect(section.getByLabel('새 비밀번호', { exact: true })).toHaveValue('')
})
