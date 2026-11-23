import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { AccountPasswordView, type PasswordSectionState } from './account-password-section'

const view = (
  props: { hasPassword: boolean; askCurrent: boolean; state?: PasswordSectionState } & Partial<{
    current: string
    password: string
    confirm: string
  }>
) =>
  renderToStaticMarkup(
    <AccountPasswordView
      hasPassword={props.hasPassword}
      askCurrent={props.askCurrent}
      email="a@b.co"
      current={props.current ?? ''}
      password={props.password ?? ''}
      confirm={props.confirm ?? ''}
      state={props.state ?? { kind: 'idle' }}
      onCurrentChange={() => {}}
      onPasswordChange={() => {}}
      onConfirmChange={() => {}}
      onSubmit={() => {}}
    />
  )

test('without a password it offers to set one, with no current-password field', () => {
  const html = view({ hasPassword: false, askCurrent: false })
  assert.match(html, />비밀번호 정하기</)
  assert.match(html, /이메일과 비밀번호로도 로그인할 수 있어요/)
  assert.doesNotMatch(html, /현재 비밀번호</)
})

test('with a password it asks for the current one and names the sessions that end', () => {
  const html = view({ hasPassword: true, askCurrent: true })
  assert.match(html, />비밀번호 바꾸기</)
  assert.match(html, />현재 비밀번호</)
  assert.match(html, /다른 기기에서는 다시 로그인해야 해요/)
})

test('right after an e-mail link sign-in the current password is not asked, and it says why', () => {
  const html = view({ hasPassword: true, askCurrent: false })
  assert.doesNotMatch(html, />현재 비밀번호</)
  assert.match(html, /이메일 링크로 방금 로그인해서 현재 비밀번호 없이 바꿀 수 있어요/)
})

test('the helper tells people who forgot the password to use the e-mail link', () => {
  assert.match(view({ hasPassword: true, askCurrent: true }), /잊었다면 로그아웃한 뒤 이메일 링크로 로그인하세요/)
})

test('the button needs a valid, confirmed new password, and the current one when asked', () => {
  const disabled = /<button type="submit" disabled=""/
  assert.match(view({ hasPassword: true, askCurrent: true, password: 'abcdefg1', confirm: 'abcdefg1' }), disabled)
  assert.doesNotMatch(
    view({ hasPassword: true, askCurrent: true, current: 'old pass 1', password: 'abcdefg1', confirm: 'abcdefg1' }),
    disabled
  )
  assert.match(view({ hasPassword: false, askCurrent: false, password: 'abcdefg1', confirm: 'nope' }), disabled)
  assert.match(view({ hasPassword: false, askCurrent: false, password: 'abc' }), /너무 짧아요/)
})

test('it reports saved and error results', () => {
  assert.match(view({ hasPassword: true, askCurrent: true, state: { kind: 'saved', changed: true } }), />비밀번호를 바꿨어요\.</)
  assert.match(view({ hasPassword: false, askCurrent: false, state: { kind: 'saved', changed: false } }), /비밀번호를 정했어요/)
  assert.match(
    view({ hasPassword: true, askCurrent: true, state: { kind: 'error', message: '현재 비밀번호가 맞지 않아요.' } }),
    />현재 비밀번호가 맞지 않아요\.</
  )
})
