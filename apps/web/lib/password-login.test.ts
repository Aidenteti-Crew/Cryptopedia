import assert from 'node:assert/strict'
import test from 'node:test'

import {
  accountHasNoPassword,
  canSkipCurrentPassword,
  newPasswordCheck,
  passwordProblem,
  requestPasswordLogin,
  requestSetPassword,
} from './password-login'

type Call = { url: string; init: RequestInit; body: Record<string, unknown> }

function respond(status: number, body: unknown = {}) {
  const calls: Call[] = []
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) })
    return new Response(JSON.stringify(body), { status })
  }) as (input: string, init?: RequestInit) => Promise<Response>
  return { fetchFn, calls }
}

function respondGet(status: number, body: unknown) {
  const urls: string[] = []
  const fetchFn = (async (url: string) => {
    urls.push(url)
    return new Response(JSON.stringify(body), { status })
  }) as (input: string, init?: RequestInit) => Promise<Response>
  return { fetchFn, urls }
}

const offline = (async () => {
  throw new Error('down')
}) as unknown as (input: string, init?: RequestInit) => Promise<Response>

test('password rules match the API: length, letter and digit, not the e-mail', () => {
  assert.equal(passwordProblem('abc1'), 'tooShort')
  assert.equal(passwordProblem('가나다라1'), 'tooShort')
  assert.equal(passwordProblem('abcdefgh'), 'needsLetterAndDigit')
  assert.equal(passwordProblem('12345678'), 'needsLetterAndDigit')
  assert.equal(passwordProblem('a1'.repeat(37)), 'tooLong')
  assert.equal(passwordProblem('가나다라마바사아자1'.repeat(3)), 'tooLong')
  assert.equal(passwordProblem('Owner1@Example.com', 'owner1@example.com'), 'sameAsEmail')
  assert.equal(passwordProblem('abcdefg1'), null)
  assert.equal(passwordProblem('비밀번호가좋아요1'), null)
})

test('sends the trimmed e-mail and the password in the body, with the cookie', async () => {
  const { fetchFn, calls } = respond(201, { accessToken: 'T' })
  const result = await requestPasswordLogin('http://api', { email: ' a@b.co ', password: 'pass word 1' }, fetchFn)
  assert.deepEqual(result, { ok: true, accessToken: 'T' })
  assert.equal(calls[0].url, 'http://api/api/app-user/password/login')
  assert.equal(calls[0].init.credentials, 'include')
  assert.deepEqual(calls[0].body, { email: 'a@b.co', password: 'pass word 1' })
  assert.doesNotMatch(calls[0].url, /pass(%20| )word/)
})

test('login answers a wrong e-mail or password with one message, and maps limits and outages', async () => {
  const wrong = await requestPasswordLogin('x', { email: 'a@b.co', password: 'p' }, respond(401, { code: 'INVALID_CREDENTIALS' }).fetchFn)
  assert.deepEqual(wrong, { ok: false, message: '이메일이나 비밀번호가 맞지 않아요.' })
  const limited = await requestPasswordLogin('x', { email: 'a@b.co', password: 'p' }, respond(429).fetchFn)
  assert.match(limited.ok ? '' : limited.message, /1분 뒤/)
  const broken = await requestPasswordLogin('x', { email: 'a@b.co', password: 'p' }, respond(500, { message: 'boom stack' }).fetchFn)
  assert.doesNotMatch(broken.ok ? '' : broken.message, /boom/)
  const down = await requestPasswordLogin('x', { email: 'a@b.co', password: 'p' }, offline)
  assert.match(down.ok ? '' : down.message, /연결하지 못했어요/)
  const noToken = await requestPasswordLogin('x', { email: 'a@b.co', password: 'p' }, respond(201, {}).fetchFn)
  assert.equal(noToken.ok, false)
})

test('a new password is ready only when it follows the rules and the confirm matches', () => {
  assert.deepEqual(newPasswordCheck('', '', 'a@b.co'), { ready: false, hint: null })
  assert.deepEqual(newPasswordCheck('abc1', '', 'a@b.co'), { ready: false, hint: '비밀번호가 너무 짧아요. 8자 이상으로 정해 주세요.' })
  assert.deepEqual(newPasswordCheck('A@B.co1x', 'A@B.co1x', 'a@b.co1x'), { ready: false, hint: '이메일 주소와 같은 비밀번호는 쓸 수 없어요.' })
  assert.deepEqual(newPasswordCheck('abcdefg1', '', 'a@b.co'), { ready: false, hint: null })
  assert.deepEqual(newPasswordCheck('abcdefg1', 'abcdefg2', 'a@b.co'), { ready: false, hint: '비밀번호가 서로 달라요.' })
  assert.deepEqual(newPasswordCheck('abcdefg1', 'abcdefg1', 'a@b.co'), { ready: true, hint: null })
})

test('the password step opens only when /me clearly says there is no password', async () => {
  const me = (status: number, body: unknown) => respondGet(status, body)
  assert.equal(await accountHasNoPassword('http://api', me(200, { hasPassword: false }).fetchFn), true)
  const seen = me(200, { hasPassword: true })
  assert.equal(await accountHasNoPassword('http://api', seen.fetchFn), false)
  assert.equal(seen.urls[0], 'http://api/api/app-user/me')
  assert.equal(await accountHasNoPassword('x', me(200, { email: 'a@b.co' }).fetchFn), false)
  assert.equal(await accountHasNoPassword('x', me(401, { hasPassword: false }).fetchFn), false)
  assert.equal(await accountHasNoPassword('x', offline), false)
})

test('changing the password sends the current one only when given, and reads the answer codes', async () => {
  const first = respond(200, { accessToken: 'N', hasPassword: true })
  assert.deepEqual(await requestSetPassword('http://api', { password: 'new pass 12' }, first.fetchFn), { ok: true, accessToken: 'N' })
  assert.deepEqual(first.calls[0].body, { password: 'new pass 12' })

  const both = respond(200, { accessToken: 'N' })
  await requestSetPassword('http://api', { password: 'new pass 12', currentPassword: 'old pass 1' }, both.fetchFn)
  assert.deepEqual(both.calls[0].body, { password: 'new pass 12', currentPassword: 'old pass 1' })

  const wrong = await requestSetPassword('x', { password: 'n' }, respond(403, { code: 'CURRENT_PASSWORD_WRONG' }).fetchFn)
  assert.deepEqual(wrong, { ok: false, message: '현재 비밀번호가 맞지 않아요.' })
  const required = await requestSetPassword('x', { password: 'n' }, respond(403, { code: 'CURRENT_PASSWORD_REQUIRED' }).fetchFn)
  assert.match(required.ok ? '' : required.message, /현재 비밀번호를 입력/)
  const weak = await requestSetPassword('x', { password: 'n' }, respond(400, { errors: [{ message: 'PASSWORD_TOO_SHORT' }] }).fetchFn)
  assert.match(weak.ok ? '' : weak.message, /너무 짧아요/)
  const down = await requestSetPassword('x', { password: 'n' }, offline)
  assert.match(down.ok ? '' : down.message, /연결하지 못했어요/)
})

test('the current password can be skipped only right after an e-mail link sign-in', () => {
  const now = 1_000_000_000_000
  const link = (ageSeconds: number, extra = {}) => ({
    tokenType: 'access',
    amr: 'link',
    authAt: now / 1000 - ageSeconds,
    ...extra,
  })
  assert.equal(canSkipCurrentPassword(link(60), now), true)
  assert.equal(canSkipCurrentPassword(link(15 * 60), now), true)
  assert.equal(canSkipCurrentPassword(link(15 * 60 + 1), now), false)
  assert.equal(canSkipCurrentPassword(link(60, { amr: 'google' }), now), false)
  assert.equal(canSkipCurrentPassword(link(60, { amr: 'password' }), now), false)
  assert.equal(canSkipCurrentPassword(link(60, { tokenType: 'refresh' }), now), false)
  assert.equal(canSkipCurrentPassword({ id: 'u' }, now), false)
  assert.equal(canSkipCurrentPassword(null, now), false)
})
