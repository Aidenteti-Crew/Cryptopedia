import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { Session } from '@/lib/session'

import { AccountControlView } from './account-control'

const render = (session: Session, pathname = '/events') =>
  renderToStaticMarkup(<AccountControlView session={session} pathname={pathname} onSignOut={() => {}} />)

test('signed out, the header offers 로그인 that comes back to the current page', () => {
  assert.match(render({ kind: 'signedOut' }), /href="\/login\?next=%2Fevents"[^>]*>로그인</)
})

test('on the login page itself the 로그인 link is not repeated', () => {
  assert.equal(render({ kind: 'signedOut' }, '/login'), '')
})

test('signed in, the header shows an account button with the email initial', () => {
  const html = render({ kind: 'signedIn', email: 'han@example.com', role: null })
  assert.match(html, /aria-label="내 계정 메뉴"[^>]*>H</)
  assert.doesNotMatch(html, />로그인</)
})

test('while an expired token is being refreshed nothing is shown', () => {
  assert.equal(render({ kind: 'expired' }), '')
})
