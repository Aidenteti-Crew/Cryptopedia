'use client'

import { useEffect, useState } from 'react'

import { AccountView } from '@/components/auth/account-view'
import { PlatformShell } from '@/components/cherry/editorial/platform-shell'
import { getAccessToken, useAuthTick } from '@/lib/auth'
import { sessionFromToken, signOut, type Session } from '@/lib/session'

export default function AccountPage() {
  useAuthTick()
  // The token lives in localStorage, which the server render cannot see; read it after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const session: Session = mounted ? sessionFromToken(getAccessToken(), Date.now()) : { kind: 'expired' }

  return (
    <PlatformShell>
      <main className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-28">
        <h1 className="text-[28px] font-semibold text-[var(--editorial-strong)]">내 계정</h1>
        <div className="mt-8">
          <AccountView session={session} onSignOut={signOut} />
        </div>
      </main>
    </PlatformShell>
  )
}
