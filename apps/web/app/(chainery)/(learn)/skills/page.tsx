import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'Skills',
  description: '검토된 지식을 스킬로 받아 내 에이전트에 연결하세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'builders' }} />
}
