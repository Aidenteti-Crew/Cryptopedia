import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Event Archive',
  description: '지난 체인 생태계 행사를 살펴보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'event-archive' }} />
}
