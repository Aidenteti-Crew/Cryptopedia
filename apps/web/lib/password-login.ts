import { fetchWithAuth, type JwtPayload } from '@/lib/auth'

export const PASSWORD_MIN_LENGTH = 8
// The API hashes with bcrypt, which only reads the first 72 bytes.
export const PASSWORD_MAX_BYTES = 72
export const LINK_SESSION_WINDOW_MS = 15 * 60 * 1000

export type PasswordProblem = 'tooShort' | 'tooLong' | 'needsLetterAndDigit' | 'sameAsEmail'

export const PASSWORD_RULES =
  '8자 이상이고, 문자와 숫자를 하나씩은 넣어 주세요. 이메일 주소와 같으면 안 돼요.'

export const PASSWORD_PROBLEM_MESSAGE: Record<PasswordProblem, string> = {
  tooShort: '비밀번호가 너무 짧아요. 8자 이상으로 정해 주세요.',
  tooLong: '비밀번호가 너무 길어요. 영문 기준 72자(한글은 24자) 안으로 줄여 주세요.',
  needsLetterAndDigit: '문자와 숫자를 하나씩은 넣어 주세요.',
  sameAsEmail: '이메일 주소와 같은 비밀번호는 쓸 수 없어요.',
}

const API_CODE_TO_PROBLEM: Record<string, PasswordProblem> = {
  PASSWORD_TOO_SHORT: 'tooShort',
  PASSWORD_TOO_LONG: 'tooLong',
  PASSWORD_NEEDS_LETTER_AND_DIGIT: 'needsLetterAndDigit',
  PASSWORD_SAME_AS_EMAIL: 'sameAsEmail',
}

// Mirrors the API rule so a bad password is caught before the request; the API stays the authority.
export function passwordProblem(password: string, email = ''): PasswordProblem | null {
  if (Array.from(password).length < PASSWORD_MIN_LENGTH) return 'tooShort'
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'tooLong'
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) return 'needsLetterAndDigit'
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) return 'sameAsEmail'
  return null
}

// One verdict for every "new password + confirm" form: whether it can be sent, and the one line
// to show under it while typing.
export function newPasswordCheck(
  password: string,
  confirm: string,
  email: string
): { ready: boolean; hint: string | null } {
  if (password.length === 0) return { ready: false, hint: null }
  const problem = passwordProblem(password, email)
  if (problem) return { ready: false, hint: PASSWORD_PROBLEM_MESSAGE[problem] }
  if (confirm !== password) {
    return { ready: false, hint: confirm.length > 0 ? '비밀번호가 서로 달라요.' : null }
  }
  return { ready: true, hint: null }
}

export function canSkipCurrentPassword(payload: JwtPayload | null, now: number): boolean {
  if (!payload || payload.tokenType !== 'access' || payload.amr !== 'link') return false
  if (typeof payload.authAt !== 'number') return false
  const age = now - payload.authAt * 1000
  return age >= 0 && age <= LINK_SESSION_WINDOW_MS
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>
export type Failure = { ok: false; message: string }

const OFFLINE = '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
const TOO_MANY = '시도가 너무 많아요. 1분 뒤에 다시 해 주세요.'

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function passwordMessageFrom(body: Record<string, unknown> | null): string | null {
  const errors = body?.errors
  if (!Array.isArray(errors)) return null
  for (const entry of errors) {
    const code = (entry as { message?: unknown })?.message
    if (typeof code === 'string' && API_CODE_TO_PROBLEM[code]) {
      return PASSWORD_PROBLEM_MESSAGE[API_CODE_TO_PROBLEM[code]]
    }
  }
  return null
}

// The refresh cookie rides on this response, hence credentials: 'include'. The password is only
// ever sent in the request body: never logged, stored, or put in a URL.
export async function requestPasswordLogin(
  apiUrl: string,
  input: { email: string; password: string },
  fetchFn: Fetcher = fetch
): Promise<{ ok: true; accessToken: string } | Failure> {
  try {
    const response = await fetchFn(`${apiUrl}/api/app-user/password/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: input.email.trim(), password: input.password }),
    })
    if (response.ok) {
      const body = await readJson(response)
      if (typeof body?.accessToken === 'string') return { ok: true, accessToken: body.accessToken }
      return { ok: false, message: '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
    }
    if (response.status === 401) return { ok: false, message: '이메일이나 비밀번호가 맞지 않아요.' }
    if (response.status === 429) return { ok: false, message: TOO_MANY }
    return { ok: false, message: '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  } catch {
    return { ok: false, message: OFFLINE }
  }
}

export async function requestSetPassword(
  apiUrl: string,
  input: { password: string; currentPassword?: string },
  fetchFn: Fetcher = fetchWithAuth
): Promise<{ ok: true; accessToken: string } | Failure> {
  try {
    const response = await fetchFn(`${apiUrl}/api/app-user/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        password: input.password,
        ...(input.currentPassword ? { currentPassword: input.currentPassword } : {}),
      }),
    })
    if (response.ok) {
      const body = await readJson(response)
      if (typeof body?.accessToken === 'string') return { ok: true, accessToken: body.accessToken }
      return { ok: false, message: '비밀번호를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
    }
    if (response.status === 429) return { ok: false, message: TOO_MANY }
    const body = await readJson(response)
    if (response.status === 403) {
      return {
        ok: false,
        message:
          body?.code === 'CURRENT_PASSWORD_WRONG'
            ? '현재 비밀번호가 맞지 않아요.'
            : '현재 비밀번호를 입력해 주세요.',
      }
    }
    if (response.status === 400) {
      return { ok: false, message: passwordMessageFrom(body) ?? '입력한 내용을 확인해 주세요.' }
    }
    return { ok: false, message: '비밀번호를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  } catch {
    return { ok: false, message: OFFLINE }
  }
}

// Only a clear "no password" from /me opens the password step; any failure skips it, so a hiccup
// never stands between a confirmed sign-up and the page the person was going to.
export async function accountHasNoPassword(apiUrl: string, fetchFn: Fetcher = fetchWithAuth): Promise<boolean> {
  try {
    const response = await fetchFn(`${apiUrl}/api/app-user/me`, { cache: 'no-store' })
    if (!response.ok) return false
    const body = await readJson(response)
    return body?.hasPassword === false
  } catch {
    return false
  }
}
