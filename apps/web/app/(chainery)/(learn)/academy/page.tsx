import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Academy',
  description: '케이스별 학습과 실습으로 체인 생태계를 익혀보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'academy' }} />
}
