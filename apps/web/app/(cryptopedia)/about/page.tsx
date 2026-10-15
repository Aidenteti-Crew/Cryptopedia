import type { Metadata } from 'next'

import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

export const metadata: Metadata = {
  title: 'About | Cryptopedia',
  description: 'Avalanche 생태계에서 만들 수 있는 것과 학습 경로를 살펴보세요.',
}

export default function Page() {
  return <EditorialApp view={{ kind: 'screen', id: 'ecosystem' }} homeVariant="new" />
}
