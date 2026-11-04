import type { Metadata } from 'next'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

/* 내 학습 경로 — 컬렉션(체인)과 상관없이 하나. 사이드바 아래 카드에서 들어온다 */
export const metadata: Metadata = {
  title: 'My Learning Path',
  description: '하는 일 · 해본 것 · 하고 싶은 것에 맞춘 내 학습 경로.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'my-path' }} />
}
