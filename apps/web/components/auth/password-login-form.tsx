'use client'

import { useState } from 'react'

import { API_URL, setAccessToken } from '@/lib/auth'
import { isEmail, requestSignInLink } from '@/lib/email-login'
import { requestPasswordLogin } from '@/lib/password-login'

import { AuthField } from './auth-field'

export type PasswordFormMode = 'login' | 'signup'

export type PasswordFormState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message: string }
  | { kind: 'signupSent'; email: string }

export function canSubmitPasswordForm(mode: PasswordFormMode, email: string, password: string): boolean {
  if (!isEmail(email)) return false
  return mode === 'signup' || password.length > 0
}

export function PasswordLoginView({
  mode,
  state,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onModeChange,
}: {
  mode: PasswordFormMode
  state: PasswordFormState
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  onModeChange: (mode: PasswordFormMode) => void
}) {
  if (state.kind === 'signupSent') {
    return (
      <div role="status" className="w-full">
        <h2 className="text-[20px] font-semibold text-[var(--editorial-strong)]">메일을 확인하세요</h2>
        <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-strong)]">
          {state.email}로 가입 확인 메일을 보냈어요. 15분 안에 메일의 버튼을 눌러 주세요.
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          버튼을 누르면 바로 로그인되고, 이어서 비밀번호를 정할 수 있어요. 이미 가입한 주소라면 그대로 로그인돼요.
        </p>
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="mt-5 text-sm text-[var(--editorial-accent)]"
        >
          로그인으로 돌아가기
        </button>
      </div>
    )
  }

  const sending = state.kind === 'sending'
  const signup = mode === 'signup'
  const disabled = sending || !canSubmitPasswordForm(mode, email, password)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled) onSubmit()
      }}
      className="w-full"
    >
      <AuthField
        id="password-form-email"
        label="이메일"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        value={email}
        onChange={onEmailChange}
        hint={signup ? '메일로 온 버튼을 누르면 가입이 끝나요. 비밀번호는 그다음에 정해요.' : undefined}
      />
      {!signup && (
        <AuthField
          id="password-form-password"
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={onPasswordChange}
        />
      )}
      <button
        type="submit"
        disabled={disabled}
        className="mt-4 h-11 w-full bg-[var(--editorial-accent)] text-sm font-semibold text-[#1b1326] disabled:opacity-40"
      >
        {sending ? (signup ? '보내는 중…' : '로그인하는 중…') : signup ? '가입 메일 받기' : '로그인'}
      </button>
      <div aria-live="polite" className="mt-3 min-h-5 text-sm leading-6">
        {state.kind === 'error' && <p className="text-[#e58a9c]">{state.message}</p>}
      </div>
      <p className="mt-2 text-sm text-[var(--editorial-muted)]">
        {signup ? '이미 계정이 있나요?' : '계정이 없나요?'}{' '}
        <button
          type="button"
          onClick={() => onModeChange(signup ? 'login' : 'signup')}
          className="text-[var(--editorial-accent)]"
        >
          {signup ? '로그인' : '회원가입'}
        </button>
      </p>
      {!signup && (
        <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">
          비밀번호를 잊었다면 아래 이메일 링크로 로그인한 뒤, 내 계정에서 새로 정할 수 있어요.
        </p>
      )}
    </form>
  )
}

export function PasswordLoginForm({
  mode,
  onModeChange,
  onSuccess,
}: {
  mode: PasswordFormMode
  onModeChange: (mode: PasswordFormMode) => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<PasswordFormState>({ kind: 'idle' })

  const changeMode = (next: PasswordFormMode) => {
    setPassword('')
    setState({ kind: 'idle' })
    onModeChange(next)
  }

  const submit = async () => {
    setState({ kind: 'sending' })
    if (mode === 'signup') {
      const address = email.trim()
      const result = await requestSignInLink(API_URL, address, { intent: 'signup' })
      setState(result.ok ? { kind: 'signupSent', email: address } : { kind: 'error', message: result.message })
      return
    }
    const result = await requestPasswordLogin(API_URL, { email, password })
    if (result.ok) {
      setAccessToken(result.accessToken)
      onSuccess()
      return
    }
    setPassword('')
    setState({ kind: 'error', message: result.message })
  }

  return (
    <PasswordLoginView
      mode={mode}
      state={state}
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
      onModeChange={changeMode}
    />
  )
}
