import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { canSubmitPasswordForm, PasswordLoginView, type PasswordFormMode, type PasswordFormState } from './password-login-form'

const view = (
  mode: PasswordFormMode,
  state: PasswordFormState = { kind: 'idle' },
  fields: { email?: string; password?: string } = {}
) =>
  renderToStaticMarkup(
    <PasswordLoginView
      mode={mode}
      state={state}
      email={fields.email ?? ''}
      password={fields.password ?? ''}
      onEmailChange={() => {}}
      onPasswordChange={() => {}}
      onSubmit={() => {}}
      onModeChange={() => {}}
    />
  )

test('login asks for e-mail and password, offers sign-up, and points forgotten passwords to the e-mail link', () => {
  const html = view('login')
  assert.match(html, />이메일</)
  assert.match(html, />비밀번호</)
  assert.match(html, /autoComplete="current-password"|autocomplete="current-password"/i)
  assert.match(html, />로그인<\/button>/)
  assert.match(html, /계정이 없나요\?[\s\S]*>회원가입</)
  assert.match(html, /이메일 링크로 로그인한 뒤, 내 계정에서 새로 정할 수 있어요/)
  assert.doesNotMatch(html, /비밀번호 확인/)
})

test('the login button stays off until both fields are filled', () => {
  assert.equal(canSubmitPasswordForm('login', 'a@b.co', ''), false)
  assert.equal(canSubmitPasswordForm('login', 'nope', 'x'), false)
  assert.equal(canSubmitPasswordForm('login', 'a@b.co', 'x'), true)
  assert.match(view('login', { kind: 'idle' }, { email: 'a@b.co' }), /<button type="submit" disabled=""/)
  assert.doesNotMatch(view('login', { kind: 'idle' }, { email: 'a@b.co', password: 'x' }), /disabled=""/)
})

test('a wrong e-mail or password shows one message under the form', () => {
  const html = view('login', { kind: 'error', message: '이메일이나 비밀번호가 맞지 않아요.' })
  assert.match(html, />이메일이나 비밀번호가 맞지 않아요\.</)
})

test('sign-up asks only for the e-mail, says the password comes after the mail, and links back to login', () => {
  const html = view('signup')
  assert.match(html, />이메일</)
  assert.doesNotMatch(html, /type="password"/)
  assert.match(html, /메일로 온 버튼을 누르면 가입이 끝나요\. 비밀번호는 그다음에 정해요\./)
  assert.match(html, />가입 메일 받기<\/button>/)
  assert.match(html, /이미 계정이 있나요\?[\s\S]*>로그인</)
})

test('sign-up can be sent as soon as the e-mail looks right', () => {
  assert.equal(canSubmitPasswordForm('signup', 'a@b', ''), false)
  assert.equal(canSubmitPasswordForm('signup', 'a@b.co', ''), true)
  assert.match(view('signup', { kind: 'idle' }, { email: 'a@b' }), /<button type="submit" disabled=""/)
  assert.doesNotMatch(view('signup', { kind: 'idle' }, { email: 'a@b.co' }), /disabled=""/)
})

test('after sign-up it says to check the mail, names the address and the 15 minutes, and what comes next', () => {
  const html = view('signup', { kind: 'signupSent', email: 'a@b.co' })
  assert.match(html, />메일을 확인하세요</)
  assert.match(html, /a@b\.co로 가입 확인 메일을 보냈어요\. 15분 안에/)
  assert.match(html, /이어서 비밀번호를 정할 수 있어요/)
  assert.match(html, />로그인으로 돌아가기</)
  assert.doesNotMatch(html, /<input/)
})
