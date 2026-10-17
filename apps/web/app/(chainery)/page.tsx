import type { Metadata } from 'next'

import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Home',
  description: '모든 체인의 이야기가 모이는 곳, 체이너리.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'ecosystem' }} />
}
