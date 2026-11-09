'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { API_URL, clearAccessToken, getAccessToken, tryRefresh, useAuthTick } from '@/lib/auth'
import { accountInitial, loginHref, sessionFromToken, type Session } from '@/lib/session'

export function AccountControlView({
  session,
  pathname,
  onSignOut,
}: {
  session: Session
  pathname: string
  onSignOut: () => void
}) {
  if (session.kind === 'expired') return null
  if (session.kind === 'signedOut') {
    if (pathname === '/login') return null
    return (
      <Link
        href={loginHref(pathname)}
        className="inline-flex h-9 items-center border border-[var(--editorial-line)] px-3 text-sm text-[var(--editorial-strong)] hover:border-[var(--editorial-accent)]"
      >
        로그인
      </Link>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="내 계정 메뉴"
        className="inline-flex h-9 w-9 items-center justify-center bg-[var(--editorial-accent)] text-sm font-semibold text-white"
      >
        {accountInitial(session.email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 rounded-none border-[var(--editorial-line)] bg-[#1b1326] p-0 text-[#f3eefb]"
      >
        <DropdownMenuLabel className="px-3 py-2.5 font-normal">
          <span className="block text-xs text-[#b9aecb]">로그인한 계정</span>
          <span className="mt-0.5 block truncate text-sm">{session.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0 bg-[var(--editorial-line)]" />
        <DropdownMenuItem
          onSelect={onSignOut}
          className="rounded-none px-3 py-2.5 text-sm focus:bg-white/10 focus:text-[#f3eefb]"
        >
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AccountControl() {
  useAuthTick()
  const pathname = usePathname() ?? '/'
  // The token lives in localStorage, which the server render cannot see; read it after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const session: Session = mounted ? sessionFromToken(getAccessToken(), Date.now()) : { kind: 'expired' }

  useEffect(() => {
    if (session.kind !== 'expired' || !mounted) return
    tryRefresh().then((token) => {
      if (!token) clearAccessToken()
    })
  }, [session.kind, mounted])

  const signOut = async () => {
    // The server drops the refresh cookie; the local token goes either way.
    await fetch(`${API_URL}/api/app-user/logout`, { method: 'POST', credentials: 'include' }).catch(
      () => undefined
    )
    clearAccessToken()
  }

  return <AccountControlView session={session} pathname={pathname} onSignOut={signOut} />
}
