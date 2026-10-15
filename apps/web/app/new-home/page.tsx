import type { Metadata } from 'next'

import { EditorialApp } from '@/components/cherry/editorial/editorial-app'

/* 생태계 홈 새 구성안 — 검토용 경로.
   `/` 는 기존 홈 그대로이고, 여기서는 같은 앱에 새 홈(EcosystemHomeV2)만 바꿔 끼워 나란히 비교한다.
   채택하지 않으면 이 폴더와 ecosystem-home-v2.tsx 를 지우면 끝난다. */
export const metadata: Metadata = {
  title: 'Cryptopedia — New Home (review)',
  description: 'Avalanche ecosystem home — proposal for review.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <EditorialApp homeVariant="new" />
}
