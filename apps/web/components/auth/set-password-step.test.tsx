import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { SetPasswordStepView, type SetPasswordStepState } from './set-password-step'

const view = (fields: { password?: string; confirm?: string } = {}, state: SetPasswordStepState = { kind: 'idle' }) =>
  renderToStaticMarkup(
    <SetPasswordStepView
      email="a@b.co"
      password={fields.password ?? ''}
      confirm={fields.confirm ?? ''}
      state={state}
      onPasswordChange={() => {}}
      onConfirmChange={() => {}}
      onSubmit={() => {}}
      onSkip={() => {}}
    />
  )

test('the step names itself, shows the rules as text, and offers to skip', () => {
  const html = view()
  assert.match(html, /<h1[^>]*>비밀번호 정하기<\/h1>/)
  assert.match(html, /8자 이상이고, 문자와 숫자를 하나씩은 넣어 주세요/)
  assert.match(html, />새 비밀번호</)
  assert.match(html, />비밀번호 확인</)
  assert.match(html, />나중에 할게요<\/button>/)
  assert.match(html, /내 계정에서 정할 수도 있어요/)
  assert.match(html, /autocomplete="username"[^>]*value="a@b\.co"|value="a@b\.co"[^>]*autocomplete="username"/i)
})

test('the save button opens only for a valid password typed twice the same way', () => {
  const submit = (html: string) => html.match(/<button type="submit"[^>]*>/)![0]
  assert.match(submit(view()), /disabled=""/)
  assert.match(submit(view({ password: 'abcdefg1', confirm: 'abcdefg2' })), /disabled=""/)
  assert.match(view({ password: 'abcdefg1', confirm: 'abcdefg2' }), /비밀번호가 서로 달라요/)
  assert.match(view({ password: 'abcdefgh' }), /문자와 숫자를 하나씩은/)
  assert.doesNotMatch(submit(view({ password: 'abcdefg1', confirm: 'abcdefg1' })), /disabled=""/)
})

test('a failed save shows the message, and skipping stays possible except while saving', () => {
  assert.match(view({}, { kind: 'error', message: '비밀번호를 저장하지 못했어요.' }), />비밀번호를 저장하지 못했어요\.</)
  assert.match(view({}, { kind: 'saving' }), />저장하는 중…</)
  assert.match(view({}, { kind: 'saving' }), /<button type="button" disabled=""[^>]*>나중에 할게요/)
  assert.doesNotMatch(view(), /<button type="button" disabled=""[^>]*>나중에 할게요/)
})
