import type { Metadata } from 'next'

import { AboutPage } from '@/components/cherry/editorial/about-page'

/* 플랫폼 입구 — 채용 · 행사/이벤트 · 블록체인 지식으로 들어가는 첫 화면 (예전 /about) */
export const metadata: Metadata = {
  description: '모든 체인의 이야기가 모이는 곳, 체이너리.',
}

export default function Page() {
  return <AboutPage />
}
