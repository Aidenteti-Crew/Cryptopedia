import type { Metadata } from 'next'

import { AboutPage } from '@/components/cherry/editorial/about-page'

export const metadata: Metadata = {
  title: 'About',
  description: '모든 체인의 이야기가 모이는 곳, 체이너리.',
}

export default function Page() {
  return <AboutPage />
}
