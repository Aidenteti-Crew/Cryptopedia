'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

import {
  CAREER_ROLES,
  EMPLOYMENT_TYPES,
  JOB_SOURCES,
  KOREA_ELIGIBILITY,
  formatLocation,
  formatPeriod,
  formatSalary,
  labelOf,
  loadCurrency,
  type CareerJob,
  type Currency,
} from '@/lib/careers'
import type { CareerDetail } from '@/lib/careers-translate'

import { AboutHeader } from './about-header'

/* 채용 공고 상세 (/careers/[id]) — 목록과 같은 흰 바탕 화면.
   수집한 원문 공고를 AI 로 한국어 정리한 것(요약 · 주요 업무 · 자격 요건 · 우대 · 근무 조건)을 보이고,
   지원은 제목 옆 버튼으로 원문에서. 아직 정리 전인 공고는 원문 요약만 보이고 그렇다고 적는다. */
const APPLY_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-1 bg-[var(--editorial-accent)] px-5 text-sm font-medium text-[var(--editorial-on-accent)] hover:opacity-90'

const SECTIONS: { key: keyof Omit<CareerDetail, 'summary' | 'korea'>; label: string }[] = [
  { key: 'responsibilities', label: '주요 업무' },
  { key: 'requirements', label: '자격 요건' },
  { key: 'preferred', label: '우대 사항' },
  { key: 'conditions', label: '근무 조건 · 복지' },
]

export function CareerDetailPage({ job, detail }: { job: CareerJob; detail: CareerDetail | null }) {
  // 연봉 통화는 목록에서 고른 것과 같게 (이 브라우저에 저장된 값)
  const [currency, setCurrency] = useState<Currency>('KRW')
  useEffect(() => setCurrency(loadCurrency()), [])

  const facts = [
    { label: '위치', value: formatLocation(job) },
    {
      label: '고용 형태',
      value: job.employment ? labelOf(EMPLOYMENT_TYPES, job.employment) : '미기재',
    },
    { label: '직무', value: labelOf(CAREER_ROLES, job.role) },
    { label: '연봉', value: formatSalary(job.salary, currency) },
    { label: '한국에서 지원', value: labelOf(KOREA_ELIGIBILITY, job.koreaEligible) },
    { label: '모집 기간', value: formatPeriod(job) },
    { label: '출처', value: labelOf(JOB_SOURCES, job.source) },
  ]

  return (
    <div className="editorial-root min-h-screen bg-[var(--editorial-paper)] text-[var(--editorial-ink)]">
      <AboutHeader light />
      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-24 sm:px-8 lg:pt-32">
        <Link
          href="/careers"
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
        >
          <ArrowLeft size={14} aria-hidden />
          채용 목록
        </Link>

        <p className="mt-6 text-[14px] text-[var(--editorial-muted)]">{job.company}</p>
        {/* 제목 옆에 지원 버튼 — 원문 공고로 바로 간다 */}
        <div className="mt-1 flex items-start justify-between gap-4">
          <h1 className="min-w-0 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--editorial-strong)] sm:text-[34px]">
            {job.title}
          </h1>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${job.company} ${job.title} 원문에서 지원 (새 창)`}
              className={`${APPLY_BUTTON} shrink-0 sm:mt-1`}
            >
              지원하기
              <ArrowUpRight size={15} aria-hidden />
            </a>
          )}
        </div>
        <p className="mt-4 text-[16px] leading-7 text-[var(--editorial-ink)]">
          {detail?.summary ?? job.summaryKo ?? '한국어 요약을 준비하고 있어요.'}
        </p>

        {/* 이름표 붙은 정보 — 왼쪽 이름표, 오른쪽 값. 한 줄에 하나씩이라 섞이지 않는다 */}
        <dl className="mt-8 divide-y divide-[var(--editorial-line)] border-y border-[var(--editorial-line)]">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-4 py-3">
              <dt className="w-24 shrink-0 text-[14px] text-[var(--editorial-muted)]">
                {fact.label}
              </dt>
              <dd className="min-w-0 break-words text-[15px] font-medium text-[var(--editorial-ink)]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        {detail ? (
          SECTIONS.filter(({ key }) => detail[key].length).map(({ key, label }) => (
            <section key={key} className="mt-12">
              <h2 className="text-[17px] font-semibold text-[var(--editorial-strong)]">{label}</h2>
              <ul className="mt-4 space-y-2.5">
                {detail[key].map((item) => (
                  <li
                    key={item}
                    className="relative pl-4 text-[15px] leading-7 text-[var(--editorial-ink)] before:absolute before:left-0 before:top-[0.75em] before:h-1 before:w-1 before:rounded-full before:bg-[var(--editorial-accent)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="mt-10 border border-[var(--editorial-line)] px-4 py-5 text-[14px] text-[var(--editorial-muted)]">
            아직 한국어로 정리하지 못한 공고예요. 자세한 내용은 원문에서 확인해 주세요.
          </p>
        )}

        {job.skills.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[17px] font-semibold text-[var(--editorial-strong)]">키워드</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded bg-[var(--editorial-hover)] px-2.5 py-1 text-[13px] text-[var(--editorial-ink)]"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 border-t border-[var(--editorial-line)] pt-6 text-xs leading-6 text-[var(--editorial-muted)]">
          {detail && '원문 공고를 AI가 한국어로 요약했어요. '}지원 자격과 마감은 원문에서 확인해
          주세요.
          <br />
          채용을 이유로 지갑 연결, 시드 문구, 입금을 요구한다면 사기예요.
        </p>
      </main>
    </div>
  )
}
