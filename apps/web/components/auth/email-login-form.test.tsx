import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { EmailLoginState } from '@/lib/email-login'

import { EmailLoginView } from './email-login-form'

const view = (state: EmailLoginState, email = 'a@b.co', resendIn = 0) =>
  renderToStaticMarkup(
    <EmailLoginView state={state} email={email} resendIn={resendIn} onEmailChange={() => {}} onSubmit={() => {}} />
  )

test('the button stays off until the address looks like an e-mail', () => {
  assert.match(view({ kind: 'idle' }, 'not-an-email'), /<button type="submit" disabled=""/)
  assert.doesNotMatch(view({ kind: 'idle' }, 'a@b.co'), /disabled=""/)
  assert.match(view({ kind: 'idle' }), />로그인 링크 받기</)
})

test('while sending the button is off and says so', () => {
  const html = view({ kind: 'sending', email: 'a@b.co' })
  assert.match(html, /disabled=""/)
  assert.match(html, />보내는 중…</)
})

test('after sending it names the address, the 15-minute limit, and the resend wait', () => {
  const html = view({ kind: 'sent', email: 'a@b.co', resendAt: 0 }, 'a@b.co', 42)
  assert.match(html, /a@b\.co로 로그인 링크를 보냈어요\. 15분 안에/)
  assert.match(html, />42초 뒤 다시 보낼 수 있어요</)
  assert.match(html, /disabled=""/)
})

test('an error is shown under the form', () => {
  assert.match(view({ kind: 'error', message: '요청이 많아요.' }), />요청이 많아요\.</)
})
