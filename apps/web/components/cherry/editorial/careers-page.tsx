'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, ChevronDown, Search } from 'lucide-react'

import {
  CAREER_ROLES,
  CAREER_SKILLS,
  EMPLOYMENT_TYPES,
  SALARY_STEPS,
  nearestSalaryStep,
  WORK_MODES,
  computeFit,
  emptyCareerProfile,
  formatLocation,
  formatMoney,
  formatPeriod,
  formatSalary,
  isListableJob,
  isProfileReady,
  labelOf,
  loadCareerProfile,
  loadCurrency,
  saveCareerProfile,
  saveCurrency,
  searchJobs,
  type CareerFit,
  type CareerJob,
  type CareerProfile,
  type CareersData,
  type Currency,
} from '@/lib/careers'

import { AboutHeader } from './about-header'

/* 채용 (/careers) — 블록체인 지식과 같은 흰 바탕 화면(읽기 쉬움이 우선). 깊이 없이 한 화면:
   왼쪽 = 내 조건(체크하는 즉시 저장 · 반영), 오른쪽 = 검색 + 공고 목록.
   조건을 체크하면 공고마다 적합도가 붙고 잘 맞는 순으로 정렬된다.
   공고는 펼치지 않는다 — 한국어 요약 · 이름표 붙은 정보 · 스킬(내 스킬은 초록)이 바로 보이고, 원문 지원하기 버튼.
   연봉은 원 / 달러를 바꿔 볼 수 있다 (공고에 적힌 통화로 저장, 표시만 환산).
   한국 지원 불가 공고는 수집 단계에서 거른다(isListableJob) — 사용자가 고르는 조건이 아니다.
   크롤링 공고라 안전을 보장하지 않는다는 안내는 늘 보인다.

   입구(/)의 .landing 클래스는 쓰지 않는다 — 그 클래스가 붙으면 문서 전체에 화면 단위 스냅 스크롤이 걸린다. */

/* 고정 헤더 아래 왼쪽 칸이 붙는 위치(px) — lg:top-28 과 같은 값 */
const PANEL_TOP = 112

const APPLY_BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-1 bg-[var(--editorial-accent)] px-4 text-sm font-medium text-[var(--editorial-on-accent)] hover:opacity-90'

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

/* 왼쪽 칸을 따로 스크롤시키지 않고 페이지 스크롤 하나로 끝까지 보이게 한다.
   칸이 화면보다 길면 붙는 위치(top)를 위로 올려서, 페이지를 내리면 칸도 함께 내려가다가
   칸의 끝이 화면 아래에 닿을 때 멈춘다. 짧으면 헤더 아래에 그대로 붙어 있다. */
function useStickyTop<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [top, setTop] = useState(PANEL_TOP)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setTop(Math.min(PANEL_TOP, window.innerHeight - element.offsetHeight - 24))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  return { ref, top }
}

export function CareersPage({ data }: { data: CareersData }) {
  // 내 조건 · 통화는 이 브라우저에만 저장 — 서버 렌더와 첫 화면에서는 기본값으로 그리고, 읽은 뒤 바꾼다
  const [profile, setProfile] = useState<CareerProfile>(emptyCareerProfile)
  const [currency, setCurrency] = useState<Currency>('KRW')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false) // 모바일에서만 접고 편다
  const panel = useStickyTop<HTMLElement>()

  useEffect(() => {
    const saved = loadCareerProfile()
    if (saved) setProfile(saved)
    setCurrency(loadCurrency())
  }, [])

  const update = (next: CareerProfile) => {
    setProfile(next)
    const empty =
      !next.roles.length && !next.skills.length && !next.workModes.length && !next.minSalary
    saveCareerProfile(empty ? null : next)
  }

  const changeCurrency = (next: Currency) => {
    setCurrency(next)
    saveCurrency(next)
    // 고른 희망 연봉은 새 통화의 가장 가까운 단계로 옮겨 선택이 사라지지 않게
    if (profile.minSalary && profile.minSalary.currency !== next)
      update({ ...profile, minSalary: nearestSalaryStep(profile.minSalary, next) })
  }

  const ready = isProfileReady(profile)
  const listable = useMemo(() => data.items.filter(isListableJob), [data.items])
  const fits = useMemo(() => {
    const map = new Map<string, CareerFit>()
    if (ready) for (const job of listable) map.set(job.id, computeFit(job, profile))
    return map
  }, [listable, profile, ready])

  // 조건이 있으면 잘 맞는 순, 없으면 최신 순
  const jobs = useMemo(() => {
    const byRecent = (a: CareerJob, b: CareerJob) => b.postedAt.localeCompare(a.postedAt)
    return [...searchJobs(listable, query)].sort(
      ready
        ? (a, b) => (fits.get(b.id)?.score ?? 0) - (fits.get(a.id)?.score ?? 0) || byRecent(a, b)
        : byRecent
    )
  }, [listable, query, fits, ready])

  const checkedCount =
    profile.roles.length +
    profile.skills.length +
    profile.workModes.length +
    (profile.minSalary ? 1 : 0)

  return (
    <div className="editorial-root min-h-screen bg-[var(--editorial-paper)] text-[var(--editorial-ink)]">
      <AboutHeader light />
      <main className="mx-auto w-full max-w-[1160px] px-4 pb-24 pt-24 sm:px-8 lg:pt-32">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[var(--editorial-strong)] sm:text-[36px]">
          웹3 채용
        </h1>
        <p className="mt-2 text-[13px] text-[var(--editorial-muted)]">
          외부 공고 모음 · 안전을 보장하지 않아요 · 지원은 원문에서
          {data.sample && ' · 지금은 샘플 공고'}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside
            ref={panel.ref}
            aria-label="내 조건"
            style={{ top: panel.top }}
            className="lg:sticky"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--editorial-line)] pb-3">
              {/* 모바일: 제목 줄을 눌러 접고 편다. 데스크톱: 늘 펼쳐져 있다 */}
              <button
                type="button"
                onClick={() => setPanelOpen((open) => !open)}
                aria-expanded={panelOpen}
                className="flex min-h-9 items-center gap-2 text-[15px] font-semibold text-[var(--editorial-strong)] lg:pointer-events-none"
              >
                내 조건
                {checkedCount > 0 && (
                  <span className="text-xs font-normal tabular-nums text-[var(--editorial-accent)]">
                    {checkedCount}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={`text-[var(--editorial-muted)] transition-transform lg:hidden ${panelOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {checkedCount > 0 && (
                <button
                  type="button"
                  onClick={() => update(emptyCareerProfile())}
                  className="min-h-9 text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
                >
                  지우기
                </button>
              )}
            </div>

            <div className={`${panelOpen ? 'block' : 'hidden'} lg:block`}>
              <ProfilePanel
                profile={profile}
                currency={currency}
                onChange={update}
                onCurrencyChange={changeCurrency}
              />
            </div>
          </aside>

          <section aria-label="채용 공고" className="min-w-0">
            <label className="flex min-h-11 items-center gap-2.5 border border-[var(--editorial-line)] bg-[var(--editorial-wash)] px-3 focus-within:border-[var(--editorial-accent)]">
              <Search size={16} className="shrink-0 text-[var(--editorial-muted)]" aria-hidden />
              <span className="sr-only">공고 검색</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="직무, 회사, 기술"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--editorial-ink)] placeholder:text-[var(--editorial-muted)] focus:outline-none"
              />
            </label>

            <p
              role="status"
              aria-live="polite"
              className="py-3 text-[13px] text-[var(--editorial-muted)]"
            >
              <strong className="font-medium tabular-nums text-[var(--editorial-ink)]">
                {jobs.length}
              </strong>
              개 ·{' '}
              {ready ? '잘 맞는 순' : '최신 순 · 직무나 스킬을 체크하면 잘 맞는 순으로 바뀌어요'}
            </p>

            {jobs.length ? (
              <ol className="divide-y divide-[var(--editorial-line)] border-y border-[var(--editorial-line)]">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <JobRow job={job} fit={fits.get(job.id)} currency={currency} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="border-y border-[var(--editorial-line)] py-16 text-center text-[15px] text-[var(--editorial-ink)]">
                맞는 공고가 없어요
              </p>
            )}

            <p className="mt-8 text-xs leading-6 text-[var(--editorial-muted)]">
              chainery는 공고를 모아 보여 줄 뿐 채용에 관여하지 않아요. 채용을 이유로 지갑 연결,
              시드 문구, 입금을 요구한다면 사기예요.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

/* ── 내 조건 — 칩을 누르는 즉시 반영 · 저장 (저장 버튼 없음) ── */
function ProfilePanel({
  profile,
  currency,
  onChange,
  onCurrencyChange,
}: {
  profile: CareerProfile
  currency: Currency
  onChange: (profile: CareerProfile) => void
  onCurrencyChange: (currency: Currency) => void
}) {
  return (
    <div className="space-y-5 pt-4">
      <Group label="직무">
        {CAREER_ROLES.map((role) => (
          <Chip
            key={role.id}
            on={profile.roles.includes(role.id)}
            onClick={() => onChange({ ...profile, roles: toggle(profile.roles, role.id) })}
          >
            {role.label}
          </Chip>
        ))}
      </Group>

      <Group label="스킬">
        {CAREER_SKILLS.map((skill) => (
          <Chip
            key={skill}
            on={profile.skills.includes(skill)}
            onClick={() => onChange({ ...profile, skills: toggle(profile.skills, skill) })}
          >
            {skill}
          </Chip>
        ))}
      </Group>

      <Group label="근무">
        {WORK_MODES.map((mode) => (
          <Chip
            key={mode.id}
            on={profile.workModes.includes(mode.id)}
            onClick={() => onChange({ ...profile, workModes: toggle(profile.workModes, mode.id) })}
          >
            {mode.label}
          </Chip>
        ))}
      </Group>

      <Group
        label="희망 연봉"
        action={<CurrencyToggle value={currency} onChange={onCurrencyChange} />}
      >
        {/* 하나만 고른다 — 다시 누르면 '상관없음' */}
        {SALARY_STEPS[currency].map((step) => {
          const on = profile.minSalary?.currency === currency && profile.minSalary.amount === step
          return (
            <Chip
              key={step}
              on={on}
              onClick={() =>
                onChange({ ...profile, minSalary: on ? null : { amount: step, currency } })
              }
            >
              {formatMoney(step, currency)}+
            </Chip>
          )
        })}
      </Group>
    </div>
  )
}

function Group({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <fieldset>
      {/* legend 는 fieldset 의 첫 자식이어야 해서 읽기용으로 두고, 보이는 이름은 토글과 한 줄에 */}
      <legend className="sr-only">{label}</legend>
      <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
        <span aria-hidden className="text-xs font-semibold text-[var(--editorial-ink)]">
          {label}
        </span>
        {action}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </fieldset>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-8 items-center gap-1 border px-2.5 text-xs transition-colors ${on ? 'border-[var(--editorial-accent)] bg-[var(--editorial-hover)] text-[var(--editorial-strong)]' : 'border-[var(--editorial-line)] text-[var(--editorial-muted)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-ink)]'}`}
    >
      {on && <Check size={12} aria-hidden />}
      {children}
    </button>
  )
}

/* 원 · $ 두 칸 토글 — 목록의 연봉 표시도 함께 바뀐다 */
function CurrencyToggle({
  value,
  onChange,
}: {
  value: Currency
  onChange: (currency: Currency) => void
}) {
  return (
    <div role="group" aria-label="연봉 통화" className="flex border border-[var(--editorial-line)]">
      {(
        [
          ['KRW', '원'],
          ['USD', '$'],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`min-h-7 min-w-8 px-2 text-[11px] ${value === id ? 'bg-[var(--editorial-accent)] font-semibold text-[var(--editorial-on-accent)]' : 'text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ── 공고 카드 — 펼치지 않는다. 누르면 한국어 상세(/careers/[id])
   회사 → 제목 → 한국어 한 줄 요약 → 이름표 붙은 정보(위치 · 고용 형태 · 연봉 · 기간) → 스킬(내 스킬은 초록 ✓)
   오른쪽(모바일은 아래): 적합도 + 원문에서 지원하기 ── */
function JobRow({
  job,
  fit,
  currency,
}: {
  job: CareerJob
  fit: CareerFit | undefined
  currency: Currency
}) {
  const matched = new Set(fit?.matchedSkills)
  const facts = [
    { label: '위치', value: formatLocation(job) },
    {
      label: '고용 형태',
      value: job.employment ? labelOf(EMPLOYMENT_TYPES, job.employment) : null,
    },
    { label: '연봉', value: formatSalary(job.salary, currency) },
    { label: '기간', value: formatPeriod(job) },
  ].filter((fact): fact is { label: string; value: string } => !!fact.value)

  return (
    <article className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:gap-6 sm:px-4">
      <Link href={`/careers/${job.id}`} className="group min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--editorial-muted)]">{job.company}</p>
        <h2 className="mt-1 text-[18px] font-semibold leading-snug text-[var(--editorial-strong)] group-hover:text-[var(--editorial-accent)]">
          {job.title}
        </h2>
        {/* 영문 원문 요약은 보이지 않는다 — 한국어 정리가 끝난 공고만 요약이 붙는다 */}
        <p
          className={`mt-2 line-clamp-2 text-[14px] leading-6 ${job.summaryKo ? 'text-[var(--editorial-ink)]' : 'text-[var(--editorial-faint)]'}`}
        >
          {job.summaryKo ?? '한국어 요약 준비 중'}
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-1.5">
              <dt className="text-[var(--editorial-muted)]">{fact.label}</dt>
              <dd className="font-medium text-[var(--editorial-ink)]">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {job.skills.length > 0 && (
          <ul aria-label="요구 스킬" className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <li
                key={skill}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[12px] ${matched.has(skill) ? 'bg-[var(--editorial-secondary-soft)] text-[var(--editorial-secondary)]' : 'bg-[var(--editorial-hover)] text-[var(--editorial-muted)]'}`}
              >
                {matched.has(skill) && <Check size={12} aria-hidden />}
                {skill}
                {matched.has(skill) && <span className="sr-only">(보유)</span>}
              </li>
            ))}
          </ul>
        )}
      </Link>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
        {/* 하나도 안 맞는 공고는 0% 대신 비워 둔다 — 맞는 공고의 숫자만 눈에 띄게 */}
        {fit && fit.score > 0 ? <FitScore score={fit.score} /> : <span />}
        {job.sourceUrl ? (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${job.company} ${job.title} 원문에서 지원 (새 창)`}
            className={APPLY_BUTTON}
          >
            지원하기
            <ArrowUpRight size={15} aria-hidden />
          </a>
        ) : (
          <span
            aria-disabled
            title="샘플 공고라 원문 링크가 없어요"
            className={`${APPLY_BUTTON} cursor-not-allowed opacity-40`}
          >
            지원하기
            <ArrowUpRight size={15} aria-hidden />
          </span>
        )}
      </div>
    </article>
  )
}

function FitScore({ score }: { score: number }) {
  return (
    <span
      className={`shrink-0 text-right tabular-nums ${score >= 70 ? 'text-[var(--editorial-strong)]' : 'text-[var(--editorial-muted)]'}`}
    >
      <span className="text-lg font-semibold">{score}</span>
      <span className="text-xs">%</span>
      <span className="sr-only"> 맞음</span>
    </span>
  )
}
