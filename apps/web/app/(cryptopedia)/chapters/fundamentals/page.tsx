import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: '체인 기초 | Cryptopedia',
  description: '체인 구조와 핵심 개념을 차례로 학습하세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'fundamentals' }} />
}
