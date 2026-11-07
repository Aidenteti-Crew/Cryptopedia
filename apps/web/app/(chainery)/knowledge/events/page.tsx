import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Events',
  description: '체인 생태계의 행사와 이벤트를 확인하세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'events' }} />
}
