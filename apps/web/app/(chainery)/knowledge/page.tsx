import type { Metadata } from 'next'

import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

/* 블록체인 지식 홈 (예전 /) — 생태계 홈 · LIVE · LEARN 이 이 섹션 안에 있다 */
export const metadata: Metadata = {
  title: 'Blockchain Knowledge',
  description: '모든 체인의 이야기가 모이는 곳, 체이너리.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'ecosystem' }} />
}
