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
}

test('events: list by day, open a detail, move between events, and close', async ({ page }) => {
  await fixData(page)
  await page.goto('/')
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '행사/이벤트' }).click()
  await expect(page).toHaveURL(/\/events$/)

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

  const submit = page.getByRole('button', { name: '로그인 링크 받기' })
  await page.getByLabel('이메일').fill('tester@example')
  await expect(submit).toBeDisabled()
  await page.getByLabel('이메일').fill('tester@example.com')
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
