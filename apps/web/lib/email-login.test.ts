import assert from 'node:assert/strict'
import test from 'node:test'

import { isEmail, requestSignInLink, secondsUntilResend } from './email-login'

test('accepts an ordinary address and rejects obvious mistakes', () => {
  assert.equal(isEmail(' name@example.com '), true)
  assert.equal(isEmail('name@example'), false)
  assert.equal(isEmail('name example.com'), false)
  assert.equal(isEmail(''), false)
})

test('counts down the resend wait only after a link was sent', () => {
  const sent = { kind: 'sent' as const, email: 'a@b.co', resendAt: 60_000 }
  assert.equal(secondsUntilResend(sent, 0), 60)
  assert.equal(secondsUntilResend(sent, 59_001), 1)
  assert.equal(secondsUntilResend(sent, 61_000), 0)
  assert.equal(secondsUntilResend({ kind: 'idle' }, 0), 0)
})

test('asks the API for a link that opens /login, with the trimmed address', async () => {
  let call: { url: string; body: unknown } | undefined
  const fetchFn = (async (url: string, init?: RequestInit) => {
    call = { url, body: JSON.parse(String(init?.body)) }
    return new Response(JSON.stringify({ expiresAt: '2026-11-09T00:15:00Z' }), { status: 201 })
  }) as typeof fetch

  assert.deepEqual(await requestSignInLink('http://api', ' a@b.co ', fetchFn), { ok: true })
  assert.deepEqual(call, { url: 'http://api/api/app-user/signin', body: { email: 'a@b.co', from: 'main' } })
})

test('turns a rate limit, a rejection and a network failure into readable messages', async () => {
  const status = (code: number) => (async () => new Response('{}', { status: code })) as unknown as typeof fetch
  const limited = await requestSignInLink('x', 'a@b.co', status(429))
  assert.equal(limited.ok, false)
  assert.match(limited.ok ? '' : limited.message, /1분 뒤/)
  const rejected = await requestSignInLink('x', 'a@b.co', status(400))
  assert.match(rejected.ok ? '' : rejected.message, /주소를 확인/)
  const offline = await requestSignInLink('x', 'a@b.co', (async () => { throw new Error('down') }) as typeof fetch)
  assert.match(offline.ok ? '' : offline.message, /연결하지 못했어요/)
})
