'use client'

import Link from 'next/link'

import type { Session } from '@/lib/session'

export function AccountView({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  if (session.kind === 'expired') {
    return <p className="text-[15px] text-[var(--editorial-muted)]">계정 정보를 확인하는 중…</p>
  }
  if (session.kind === 'signedOut') {
    return (
      <div>
        <p className="text-[15px] text-[var(--editorial-strong)]">로그인하면 계정을 관리할 수 있어요.</p>
        <Link href="/login?next=%2Faccount" className="mt-4 inline-block text-sm text-[var(--editorial-accent)]">
          로그인하기 →
        </Link>
      </div>
    )
  }
  return (
    <section className="border border-[var(--editorial-line)] p-5">
      <p className="text-xs text-[var(--editorial-muted)]">로그인한 계정</p>
      <p className="mt-1 break-all text-[15px] text-[var(--editorial-strong)]">{session.email}</p>
      <button onClick={onSignOut} className="mt-4 text-sm text-[var(--editorial-accent)]">
        로그아웃
      </button>
    </section>
  )
}
