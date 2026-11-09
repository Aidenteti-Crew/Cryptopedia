'use client'

import { useEffect, useState } from 'react'

import { API_URL } from '@/lib/auth'
import {
  isEmail,
  requestSignInLink,
  RESEND_COOLDOWN_MS,
  secondsUntilResend,
  type EmailLoginState,
} from '@/lib/email-login'

export function EmailLoginView({
  state,
  email,
  resendIn,
  onEmailChange,
  onSubmit,
}: {
  state: EmailLoginState
  email: string
  resendIn: number
  onEmailChange: (value: string) => void
  onSubmit: () => void
}) {
  const sending = state.kind === 'sending'
  const disabled = sending || resendIn > 0 || !isEmail(email)
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled) onSubmit()
      }}
      className="w-full"
    >
      <label htmlFor="login-email" className="text-sm text-[var(--editorial-muted)]">
        이메일
      </label>
      <input
        id="login-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="name@example.com"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        className="mt-2 h-11 w-full border border-[var(--editorial-line)] bg-transparent px-3 text-[15px] text-[var(--editorial-strong)] outline-none placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-accent)]"
      />
      <button
        type="submit"
        disabled={disabled}
        className="mt-3 h-11 w-full bg-[var(--editorial-accent)] text-sm font-semibold text-white disabled:opacity-40"
      >
        {sending ? '보내는 중…' : resendIn > 0 ? `${resendIn}초 뒤 다시 보낼 수 있어요` : '로그인 링크 받기'}
      </button>
      <div aria-live="polite" className="mt-3 min-h-5 text-sm leading-6">
        {state.kind === 'sent' && (
          <p className="text-[var(--editorial-strong)]">
            {state.email}로 로그인 링크를 보냈어요. 15분 안에 메일의 버튼을 눌러 주세요.
          </p>
        )}
        {state.kind === 'error' && <p className="text-[#e58a9c]">{state.message}</p>}
      </div>
    </form>
  )
}

export function EmailLoginForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<EmailLoginState>({ kind: 'idle' })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (state.kind !== 'sent') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [state.kind])

  const submit = async () => {
    const address = email.trim()
    setState({ kind: 'sending', email: address })
    const result = await requestSignInLink(API_URL, address)
    setNow(Date.now())
    setState(
      result.ok
        ? { kind: 'sent', email: address, resendAt: Date.now() + RESEND_COOLDOWN_MS }
        : { kind: 'error', message: result.message }
    )
  }

  return (
    <EmailLoginView
      state={state}
      email={email}
      resendIn={secondsUntilResend(state, now)}
      onEmailChange={setEmail}
      onSubmit={submit}
    />
  )
}
