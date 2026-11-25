'use client'

import { useEffect, useState } from 'react'

import { API_URL, decodeToken, fetchWithAuth, getAccessToken, setAccessToken } from '@/lib/auth'
import { PASSWORD_RULES, canSkipCurrentPassword, newPasswordCheck, requestSetPassword } from '@/lib/password-login'

import { AuthField } from './auth-field'

export type PasswordSectionState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; changed: boolean }
  | { kind: 'error'; message: string }

export function AccountPasswordView({
  hasPassword,
  askCurrent,
  email,
  current,
  password,
  confirm,
  state,
  onCurrentChange,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
}: {
  hasPassword: boolean
  askCurrent: boolean
  email: string
  current: string
  password: string
  confirm: string
  state: PasswordSectionState
  onCurrentChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onSubmit: () => void
}) {
  const check = newPasswordCheck(password, confirm, email)
  const disabled = state.kind === 'saving' || !check.ready || (askCurrent && current.length === 0)

  return (
    <section className="mt-6 border border-[var(--editorial-line)] p-5" aria-labelledby="account-password-title">
      <h2 id="account-password-title" className="text-[17px] font-semibold text-[var(--editorial-strong)]">
        비밀번호
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
        {hasPassword
          ? '비밀번호를 바꿀 수 있어요. 바꾸면 다른 기기에서는 다시 로그인해야 해요.'
          : '비밀번호를 정하면 이메일과 비밀번호로도 로그인할 수 있어요.'}
      </p>
      {hasPassword && !askCurrent && (
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          이메일 링크로 방금 로그인해서 현재 비밀번호 없이 바꿀 수 있어요.
        </p>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!disabled) onSubmit()
        }}
        className="mt-4"
      >
        {askCurrent && (
          <AuthField
            id="account-password-current"
            label="현재 비밀번호"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={onCurrentChange}
          />
        )}
        <AuthField
          id="account-password-new"
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={onPasswordChange}
          hint={PASSWORD_RULES}
        />
        <AuthField
          id="account-password-confirm"
          label="새 비밀번호 확인"
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
          {state.kind === 'saving' ? '저장하는 중…' : hasPassword ? '비밀번호 바꾸기' : '비밀번호 정하기'}
        </button>
        <div aria-live="polite" className="mt-3 min-h-5 text-sm leading-6">
          {state.kind === 'saved' && (
            <p className="text-[var(--editorial-strong)]">
              {state.changed ? '비밀번호를 바꿨어요.' : '비밀번호를 정했어요. 이제 이메일과 비밀번호로 로그인할 수 있어요.'}
            </p>
          )}
          {state.kind === 'error' && <p className="text-[#e58a9c]">{state.message}</p>}
          {state.kind !== 'error' && check.hint && <p className="text-[var(--editorial-muted)]">{check.hint}</p>}
        </div>
      </form>
      <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">
        비밀번호를 잊었다면 로그아웃한 뒤 이메일 링크로 로그인하세요. 그 직후에는 현재 비밀번호 없이 새로 정할 수 있어요.
      </p>
    </section>
  )
}

export function AccountPasswordSection({ email }: { email: string }) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [state, setState] = useState<PasswordSectionState>({ kind: 'idle' })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    fetchWithAuth(`${API_URL}/api/app-user/me`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((me: { hasPassword?: unknown } | null) => {
        if (!cancelled && typeof me?.hasPassword === 'boolean') setHasPassword(me.hasPassword)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (hasPassword === null) return null

  const askCurrent = hasPassword && !canSkipCurrentPassword(decodeToken(getAccessToken()), now)

  const submit = async () => {
    setState({ kind: 'saving' })
    const result = await requestSetPassword(API_URL, {
      password,
      currentPassword: askCurrent ? current : undefined,
    })
    setNow(Date.now())
    if (!result.ok) {
      // Keep what was typed: after a wrong current password only that field needs fixing.
      setState({ kind: 'error', message: result.message })
      return
    }
    setCurrent('')
    setPassword('')
    setConfirm('')
    setAccessToken(result.accessToken)
    setState({ kind: 'saved', changed: hasPassword })
    setHasPassword(true)
  }

  // An old error must not stay up once the person edits: it read as if the retry failed too.
  const edit = (set: (value: string) => void) => (value: string) => {
    set(value)
    if (state.kind === 'error' || state.kind === 'saved') setState({ kind: 'idle' })
  }

  return (
    <AccountPasswordView
      hasPassword={hasPassword}
      askCurrent={askCurrent}
      email={email}
      current={current}
      password={password}
      confirm={confirm}
      state={state}
      onCurrentChange={edit(setCurrent)}
      onPasswordChange={edit(setPassword)}
      onConfirmChange={edit(setConfirm)}
      onSubmit={submit}
    />
  )
}
