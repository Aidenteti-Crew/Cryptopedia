import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import careers from '@/public/cryptopedia/careers.json'
import careerDetails from '@/public/cryptopedia/careers-detail.json'
import { CareerDetailPage } from '@/components/cherry/editorial/career-detail-page'
import { careersSchema } from '@/lib/careers'
import { careerDetailsSchema } from '@/lib/careers-translate'

/* 채용 공고 상세 — 목록(careers.json)의 공고마다 한 장. 한국어 정리는 careers-detail.json (scripts/translate-careers.ts) */
const data = careersSchema.parse(careers)
const details = careerDetailsSchema.parse(careerDetails)

export const dynamicParams = false

export function generateStaticParams() {
  return data.items.map((job) => ({ id: job.id }))
}

type Props = { params: Promise<{ id: string }> }

const findJob = (id: string) => data.items.find((job) => job.id === id)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = findJob((await params).id)
  if (!job) return {}
  return {
    title: `${job.title} · ${job.company}`,
    description: details[job.id]?.summary ?? job.summaryKo ?? job.summary,
  }
}

export default async function Page({ params }: Props) {
  const job = findJob((await params).id)
  if (!job) notFound()
  const detail = details[job.id]
  return (
    <CareerDetailPage
      job={job}
      detail={
        detail
          ? {
              summary: detail.summary,
              responsibilities: detail.responsibilities,
              requirements: detail.requirements,
              preferred: detail.preferred,
              conditions: detail.conditions,
              korea: detail.korea,
            }
          : null
      }
    />
  )
}
