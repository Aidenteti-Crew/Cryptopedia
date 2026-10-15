import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: '빌더 라이브러리 | Cryptopedia',
  description: '공식 문서와 개발 도구, 에이전트 스킬을 찾아보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'builders' }} />
}
