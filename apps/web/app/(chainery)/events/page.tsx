import type { Metadata } from 'next'

import { PlatformPlaceholderPage } from '@/components/cherry/editorial/platform-placeholder-page'

/* 플랫폼 행사 — 모든 체인의 행사 + 운영자가 직접 올리는 행사 (체인별 크롤링 행사는 /knowledge/events) */
export const metadata: Metadata = {
  title: 'Events',
  description: '블록체인 행사와 이벤트를 한곳에서 확인하세요.',
}

export default function Page() {
  return (
    <PlatformPlaceholderPage
      title="행사/이벤트"
      description="모든 체인의 행사와 chainery가 직접 여는 행사를 이곳에 모을 예정입니다."
    />
  )
}
