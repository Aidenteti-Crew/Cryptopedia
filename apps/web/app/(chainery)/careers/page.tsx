import type { Metadata } from 'next'

import { PlatformPlaceholderPage } from '@/components/cherry/editorial/platform-placeholder-page'

export const metadata: Metadata = {
  title: 'Careers',
  description: '블록체인 업계 채용 정보를 확인하세요.',
}

export default function Page() {
  return (
    <PlatformPlaceholderPage
      title="채용"
      description="블록체인 프로젝트의 채용 소식을 이곳에 모을 예정입니다."
    />
  )
}
