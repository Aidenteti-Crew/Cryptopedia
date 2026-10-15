import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: '개발 업데이트 | Cryptopedia',
  description: '프로토콜 변경과 개발 소식을 원문 출처와 함께 읽어보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'updates' }} />
}
