import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Builder Type Test',
  description: '나에게 맞는 체인 생태계 탐색 경로를 찾아보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'builder-test' }} />
}
