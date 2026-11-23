import type { Metadata } from 'next'

import careers from '@/public/cryptopedia/careers.json'
import { CareersPage } from '@/components/cherry/editorial/careers-page'
import { careersSchema } from '@/lib/careers'

export const metadata: Metadata = {
  title: 'Careers',
  description: '블록체인 업계 채용 공고를 모아 보고, 내 스킬에 맞는 공고를 찾아보세요.',
}

/* 공고는 지금 정적 샘플(public/cryptopedia/careers.json) — 수집 파이프라인이 붙으면 API로 바꾼다 */
const data = careersSchema.parse(careers)

export default function Page() {
  return <CareersPage data={data} />
}
