import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: '매크로 소식 | Cryptopedia',
  description: '금융기관 협업과 블록체인 산업의 변화를 살펴보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'macro' }} />
}
