import assert from 'node:assert/strict'
import test from 'node:test'

import { accountInitial, loginHref, sessionFromToken } from './session'

const token = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64')}.s`
const NOW = Date.UTC(2026, 10, 9)

test('a current token is a signed-in session with its email and role', () => {
  assert.deepEqual(sessionFromToken(token({ email: 'a@b.co', role: 'ADMIN', exp: NOW / 1000 + 60 }), NOW), {
    kind: 'signedIn',
    email: 'a@b.co',
    role: 'ADMIN',
  })
})

test('a token past its expiry waits for a refresh instead of showing either state', () => {
  assert.deepEqual(sessionFromToken(token({ email: 'a@b.co', exp: NOW / 1000 - 1 }), NOW), { kind: 'expired' })
})

test('no token or an unreadable one is signed out', () => {
  assert.deepEqual(sessionFromToken(null, NOW), { kind: 'signedOut' })
  assert.deepEqual(sessionFromToken('garbage', NOW), { kind: 'signedOut' })
  assert.deepEqual(sessionFromToken(token({ id: 'u1' }), NOW), { kind: 'signedOut' })
})

test('the avatar shows the first letter of the email', () => {
  assert.equal(accountInitial('han@example.com'), 'H')
})

test('signing in returns to the current page, except from /login itself', () => {
  assert.equal(loginHref('/events'), '/login?next=%2Fevents')
  assert.equal(loginHref('/login'), '/login')
})
