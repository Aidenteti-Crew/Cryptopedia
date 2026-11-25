import type { ReactNode } from 'react'

import { AboutHeader } from './about-header'

// Dark platform pages (행사/이벤트, 로그인) under the shared header. Not the landing's .landing
// class: it turns on page-wide scroll snapping, wrong for pages that scroll normally.
export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="editorial-root editorial-dark min-h-[100dvh] bg-[#1b1326] text-[#f3eefb]">
      {/* The header fades out over the landing hero; content scrolling under it needs a solid band. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-16 bg-[#1b1326] lg:h-[88px]" />
      <AboutHeader />
      {children}
    </div>
  )
}
