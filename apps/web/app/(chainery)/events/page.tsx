import type { Metadata } from 'next'

import { PlatformEventsPage } from '@/components/cherry/editorial/platform-events-page'

/* 플랫폼 행사 — 모든 체인의 행사 + 운영자가 직접 올리는 행사 (체인별 크롤링 행사는 /knowledge/events) */
export const metadata: Metadata = {
  title: 'Events',
  description: '블록체인 행사와 이벤트를 한곳에서 확인하세요.',
}

export default function Page() {
  return <PlatformEventsPage />
}
