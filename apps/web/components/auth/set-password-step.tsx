'use client'

import { useState } from 'react'

import { API_URL, setAccessToken } from '@/lib/auth'
import { PASSWORD_RULES, newPasswordCheck, requestSetPassword } from '@/lib/password-login'

import { AuthField } from './auth-field'

export type SetPasswordStepState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }

export function SetPasswordStepView({
  email,
  password,
  confirm,
  state,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
  onSkip,
}: {
  email: string
  password: string
  confirm: string
  state: SetPasswordStepState
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onSubmit: () => void
  onSkip: () => void
}) {
  const check = newPasswordCheck(password, confirm, email)
  const saving = state.kind === 'saving'
  const disabled = saving || !check.ready

  return (
    <div className="w-full">
      <h1 className="text-[28px] font-semibold leading-tight text-[var(--editorial-strong)]">비밀번호 정하기</h1>
      <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-muted)]">
        가입이 끝났어요. 비밀번호를 정하면 다음부터 이메일과 비밀번호로 로그인할 수 있어요.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!disabled) onSubmit()
        }}
        className="mt-8"
      >
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <AuthField
          id="set-password-new"
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={onPasswordChange}
          hint={PASSWORD_RULES}
        />
        <AuthField
          id="set-password-confirm"
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={onConfirmChange}
        />
        <button
          type="submit"
          disabled={disabled}
          className="mt-4 h-11 w-full bg-[var(--editorial-accent)] text-sm font-semibold text-[#1b1326] disabled:opacity-40"
        >
          {saving ? '저장하는 중…' : '비밀번호 정하기'}
        </button>
        <div aria-live="polite" className="mt-3 min-h-5 text-sm leading-6">
          {state.kind === 'error' && <p className="text-[#e58a9c]">{state.message}</p>}
          {state.kind !== 'error' && check.hint && <p className="text-[var(--editorial-muted)]">{check.hint}</p>}
        </div>
      </form>
      <button
        type="button"
        onClick={onSkip}
        disabled={saving}
        className="mt-2 h-11 w-full border border-[var(--editorial-line)] text-sm text-[var(--editorial-strong)] disabled:opacity-40"
      >
        나중에 할게요
      </button>
      <p className="mt-3 text-xs leading-5 text-[var(--editorial-muted)]">
        나중에 내 계정에서 정할 수도 있어요. 그때까지는 이메일 링크나 Google로 로그인하면 돼요.
      </p>
    </div>
  )
}

export function SetPasswordStep({ email, onDone }: { email: string; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [state, setState] = useState<SetPasswordStepState>({ kind: 'idle' })

  const submit = async () => {
    setState({ kind: 'saving' })
    const result = await requestSetPassword(API_URL, { password })
    if (result.ok) {
      setAccessToken(result.accessToken)
      onDone()
      return
    }
    setPassword('')
    setConfirm('')
    setState({ kind: 'error', message: result.message })
  }

  return (
    <SetPasswordStepView
      email={email}
      password={password}
      confirm={confirm}
      state={state}
      onPasswordChange={setPassword}
      onConfirmChange={setConfirm}
      onSubmit={submit}
      onSkip={onDone}
    />
  )
}
