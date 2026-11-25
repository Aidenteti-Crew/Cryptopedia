import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PlatformEventsPage } from '@/components/cherry/editorial/platform-events-page'

/* 행사/이벤트 — 모든 체인의 행사 + 운영자가 직접 올리는 행사를 달력·리스트로 보고, 체인별로 거르고, 관심 행사를 담는 단일 페이지.
   예전 체인별 목록 /knowledge/events 는 여기로 넘어온다 (next.config.mjs) */
export const metadata: Metadata = {
  title: 'Events',
  description: '블록체인 행사와 이벤트를 한곳에서 확인하세요.',
}

export default function Page() {
  // useSearchParams (the open event) needs a Suspense boundary in the App Router.
  return (
    <Suspense>
      <PlatformEventsPage />
    </Suspense>
  )
}
