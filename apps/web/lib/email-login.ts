export const RESEND_COOLDOWN_MS = 60_000

export type EmailLoginState =
  | { kind: 'idle' }
  | { kind: 'sending'; email: string }
  | { kind: 'sent'; email: string; resendAt: number }
  | { kind: 'error'; message: string }

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function secondsUntilResend(state: EmailLoginState, now: number): number {
  return state.kind === 'sent' ? Math.max(0, Math.ceil((state.resendAt - now) / 1000)) : 0
}

// Asks the API to e-mail a one-time sign-in link. from=main makes the link open /login (not the
// older /start/login). The address is never logged or kept beyond this request.
export async function requestSignInLink(
  apiUrl: string,
  email: string,
  fetchFn: typeof fetch = fetch
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetchFn(`${apiUrl}/api/app-user/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), from: 'main' }),
    })
    if (response.ok) return { ok: true }
    if (response.status === 429) {
      return { ok: false, message: '요청이 많아요. 1분 뒤에 다시 시도해 주세요.' }
    }
    return { ok: false, message: '로그인 메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요.' }
  } catch {
    return { ok: false, message: '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  }
}
