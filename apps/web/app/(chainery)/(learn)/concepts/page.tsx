import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Concepts',
  description: '공식 문서를 근거로 정리한 체인의 핵심 개념을 살펴보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'fundamentals' }} />
}
