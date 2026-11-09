import { decodeToken } from './auth'

export type Session =
  | { kind: 'signedOut' }
  // An access token past its expiry: the refresh cookie may still renew it.
  | { kind: 'expired' }
  | { kind: 'signedIn'; email: string; role: string | null }

// UI hint only: the token is decoded, not verified. The API checks every request itself.
export function sessionFromToken(token: string | null, now: number): Session {
  const payload = decodeToken(token)
  if (!payload || typeof payload.email !== 'string') return { kind: 'signedOut' }
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= now) return { kind: 'expired' }
  return { kind: 'signedIn', email: payload.email, role: typeof payload.role === 'string' ? payload.role : null }
}

export function accountInitial(email: string): string {
  return (email.trim()[0] ?? '?').toUpperCase()
}

// Back to the page the person was on once they sign in. /login itself is not a place to return to.
export function loginHref(pathname: string): string {
  return pathname && pathname !== '/login' ? `/login?next=${encodeURIComponent(pathname)}` : '/login'
}
