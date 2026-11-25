import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { Session } from '@/lib/session'

import { AccountView } from './account-view'

const render = (session: Session) =>
  renderToStaticMarkup(<AccountView session={session} onSignOut={() => {}} />)

test('signed out, it asks to sign in and comes back to /account', () => {
  const html = render({ kind: 'signedOut' })
  assert.match(html, /로그인하면 계정을 관리할 수 있어요/)
  assert.match(html, /href="\/login\?next=%2Faccount"/)
})

test('signed in, it shows the account e-mail and sign-out, and no deletion yet', () => {
  const html = render({ kind: 'signedIn', email: 'han@example.com', role: null })
  assert.match(html, /han@example\.com/)
  assert.match(html, />로그아웃</)
  assert.doesNotMatch(html, /계정 삭제/)
})
