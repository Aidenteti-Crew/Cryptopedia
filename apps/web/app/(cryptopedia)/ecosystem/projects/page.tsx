import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: '체인·프로젝트 | Cryptopedia',
  description: '체인 생태계의 프로젝트와 공식 자료를 살펴보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'projects' }} />
}
