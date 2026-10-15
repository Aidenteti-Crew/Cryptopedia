import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: '컬렉션 선택 | Cryptopedia',
  description: '학습할 블록체인 컬렉션을 선택하세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'chains' }} />
}
