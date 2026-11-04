'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'

import type { HubData } from '@/lib/cryptopedia-hub'
import { addPath, dismissOnboarding, setProfile } from '@/lib/learner/actions'
import { computeRoute, pathTargets } from '@/lib/learner/route'
import {
  EXPERIENCE_IDS,
  EXPERIENCES,
  GOAL_FIT,
  ROLE_IDS,
  ROLES,
  knownFromExperience,
  type ExperienceId,
  type LearnerRole,
} from '@/lib/learner/tracks'
import { newPathId, updateLearner, useLearner } from '@/lib/learner/use-learner'

/* 내 경로 만들기 설문 — 방식 → 하는 일 → 해본 것 → (목표) → 확인.
   지식 홈에 처음 들어올 때는 전체 화면(fullscreen), 내 학습 경로 페이지에서는 본문(inline)으로 같은 설문을 쓴다.
   답은 '경로 만들기'를 누를 때 처음 저장한다 — 중간에 나가면 아무것도 남기지 않는다. */

type Step = 'mode' | 'role' | 'experience' | 'goal' | 'confirm'
type Mode = 'track' | 'goal'

const OPTION_CLASS =
  'flex w-full items-start gap-4 border px-5 py-4 text-left transition-colors hover:border-[var(--editorial-accent)]'
const optionState = (on: boolean) =>
  on
    ? 'border-[var(--editorial-accent)] bg-[var(--editorial-hover)] shadow-[inset_3px_0_0_var(--editorial-accent)]'
    : 'border-[var(--editorial-line)] bg-[var(--editorial-surface)]'

export function MyPathOnboarding({
  hub,
  fullscreen = false,
  adding = false,
  onExit,
  onCreated,
}: {
  hub: HubData
  fullscreen?: boolean
  /** 이미 경로가 있는 사람이 경로를 하나 더 만드는 중 — 하는 일·해본 것을 불러온다 */
  adding?: boolean
  onExit?: () => void
  onCreated: (pathId: string) => void
}) {
  const { state, persisted } = useLearner()
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode | null>(null)
  const [role, setRole] = useState<LearnerRole | null>(null)
  const [experience, setExperience] = useState<ExperienceId[]>([])
  const [goal, setGoal] = useState<string | null>(null)
  const [name, setName] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [mounted, setMounted] = useState(false)

  // 저장된 프로필(하는 일 · 해본 것)이 있으면 처음 한 번 불러온다
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !state) return
    prefilled.current = true
    if (state.profile.role) setRole(state.profile.role)
    setExperience(state.profile.experience)
  }, [state])

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (prefilled.current) headingRef.current?.focus()
  }, [step])
  useEffect(() => {
    if (!fullscreen || !onExit) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onExit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, onExit])

  const steps: Step[] =
    mode === 'goal'
      ? ['mode', 'role', 'experience', 'goal', 'confirm']
      : ['mode', 'role', 'experience', 'confirm']
  const index = steps.indexOf(step)
  const draft =
    mode && role && (mode === 'track' || goal)
      ? { mode, role, goal: mode === 'goal' ? goal : null }
      : null
  const preview = useMemo(
    () =>
      draft
        ? computeRoute(hub, draft, {
            profile: { role: draft.role, experience },
            progress: state?.progress ?? {},
          })
        : null,
    [hub, draft?.mode, draft?.role, draft?.goal, experience, state?.progress]
  )
  const suggestedName = draft ? pathTargets(hub, draft).name : ''
  const known = knownFromExperience(experience)
  const conceptTitle = (id: string) =>
    hub.concepts.find((concept) => concept.id === id)?.title ?? id

  const canNext =
    step === 'mode' ? !!mode : step === 'role' ? !!role : step === 'goal' ? !!goal : true
  const go = (to: Step) => setStep(to)
  const next = () => canNext && index < steps.length - 1 && go(steps[index + 1])
  const back = () => (index > 0 ? go(steps[index - 1]) : onExit?.())

  const create = () => {
    if (!draft) return
    const id = newPathId()
    const now = new Date().toISOString()
    updateLearner((current) =>
      addPath(
        setProfile(current, draft.role, experience),
        { ...draft, name: name.trim() || suggestedName },
        id,
        now
      )
    )
    onCreated(id)
  }

  const toggleExperience = (id: ExperienceId) =>
    setExperience((list) =>
      list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
    )

  let title = ''
  let lede = ''
  let body: React.ReactNode = null
  switch (step) {
    case 'mode':
      title = '어떻게 배우고 싶으세요?'
      lede = '나중에 다른 방식으로 경로를 하나 더 만들 수 있어요.'
      body = (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              [
                'track',
                '처음부터 차근차근 쌓기',
                '하는 일에 맞는 기본기를 순서대로',
                ['처음이거나 분야를 넓히고 싶을 때', '역할별 트랙 · 개념 → 실습 순'],
              ],
              [
                'goal',
                '목표 하나 이루기',
                '하고 싶은 일에서 거꾸로, 필요한 것만',
                ['당장 해야 할 일이 있을 때', '목표에 필요한 개념만 골라 순서대로'],
              ],
            ] as const
          ).map(([value, label, summary, points]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value)
                if (value === 'track') setGoal(null)
              }}
              className={`${OPTION_CLASS} flex-col ${optionState(mode === value)}`}
            >
              <span>
                <span className="block text-[15px] font-semibold text-[var(--editorial-strong)]">
                  {label}
                </span>
                <span className="mt-1 block text-sm text-[var(--editorial-muted)]">{summary}</span>
              </span>
              <ul className="ml-4 list-disc text-[12.5px] leading-6 text-[var(--editorial-muted)]">
                {points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )
      break
    case 'role':
      title = '지금 어떤 일을 하세요?'
      lede = '가장 가까운 하나를 골라 주세요. 경로의 깊이와 실습 비중이 달라져요.'
      body = (
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={role === id}
              onClick={() => setRole(id)}
              className={`${OPTION_CLASS} ${optionState(role === id)}`}
            >
              <span>
                <span className="block text-[15px] font-semibold text-[var(--editorial-strong)]">
                  {ROLES[id].label}
                </span>
                <span className="mt-1 block text-sm text-[var(--editorial-muted)]">
                  {ROLES[id].summary}
                </span>
              </span>
            </button>
          ))}
        </div>
      )
      break
    case 'experience':
      title = '해본 적 있는 것을 모두 골라 주세요'
      lede =
        '“얼마나 아세요?” 대신 해본 일로 물어요. 고른 만큼 지도에서 이미 아는 개념으로 표시돼요.'
      body = (
        <>
          <div className="grid gap-2">
            {EXPERIENCE_IDS.map((id) => {
              const on = experience.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleExperience(id)}
                  className={`${OPTION_CLASS} items-center py-3.5 ${optionState(on)}`}
                >
                  <CheckBox on={on} />
                  <span className="text-sm text-[var(--editorial-ink)]">
                    {EXPERIENCES[id].label}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              role="checkbox"
              aria-checked={experience.length === 0}
              onClick={() => setExperience([])}
              className={`${OPTION_CLASS} items-center py-3.5 ${optionState(experience.length === 0)}`}
            >
              <CheckBox on={experience.length === 0} />
              <span className="text-sm text-[var(--editorial-ink)]">아직 없어요</span>
            </button>
          </div>
          <p className="mt-4 border border-dashed border-[var(--editorial-line)] px-4 py-3 text-sm leading-6 text-[var(--editorial-muted)]">
            {known.size ? (
              <>
                <b className="text-[var(--editorial-accent)]">개념 {known.size}개</b>를 이미 아는
                것으로 표시해요: {[...known].map(conceptTitle).join(' · ')}
              </>
            ) : (
              '모든 개념을 처음부터 보여 드려요.'
            )}
            <br />
            <span className="text-xs">내 경로 화면에서 언제든 되돌릴 수 있어요.</span>
          </p>
        </>
      )
      break
    case 'goal':
      title = '무엇을 해내고 싶으세요?'
      lede = role ? `${ROLES[role].label}에게 맞는 목표에 추천 표시를 했어요.` : ''
      body = (
        <div className="grid gap-2">
          {[...hub.cases]
            .sort(
              (a, b) =>
                Number(!!role && GOAL_FIT[b.id]?.includes(role)) -
                Number(!!role && GOAL_FIT[a.id]?.includes(role))
            )
            .map((study) => (
              <button
                key={study.id}
                type="button"
                aria-pressed={goal === study.id}
                onClick={() => setGoal(study.id)}
                className={`${OPTION_CLASS} ${optionState(goal === study.id)}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[var(--editorial-strong)]">
                    {study.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--editorial-muted)]">
                    {study.summary}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5 text-[11px]">
                  {role && GOAL_FIT[study.id]?.includes(role) && (
                    <span className="border border-[var(--editorial-accent)] px-1.5 py-0.5 text-[var(--editorial-accent)]">
                      추천
                    </span>
                  )}
                  <span className="text-[var(--editorial-muted)]">
                    {study.level === 'BEGINNER' ? '입문' : '중급'} · {study.minutes}분
                  </span>
                </span>
              </button>
            ))}
        </div>
      )
      break
    case 'confirm': {
      const concepts = preview?.steps.filter((item) => item.kind === 'concept') ?? []
      const knownCount = concepts.filter((item) => item.status).length
      const row = (label: string, value: React.ReactNode, to: Step) => (
        <div className="flex items-baseline gap-4 border-b border-[var(--editorial-line)] px-4 py-3 last:border-b-0">
          <span className="w-20 shrink-0 text-xs text-[var(--editorial-muted)]">{label}</span>
          <span className="min-w-0 flex-1 text-sm text-[var(--editorial-ink)]">{value}</span>
          <button
            type="button"
            onClick={() => go(to)}
            className="shrink-0 text-xs text-[var(--editorial-accent)] hover:underline"
          >
            수정
          </button>
        </div>
      )
      title = '이렇게 경로를 만들게요'
      lede = '경로 이름은 바꿀 수 있어요.'
      body = (
        <>
          <div className="border border-[var(--editorial-line)]">
            {row('방식', mode === 'goal' ? '목표 하나 이루기' : '처음부터 차근차근 쌓기', 'mode')}
            {row('하는 일', role ? ROLES[role].label : '-', 'role')}
            {row(
              '해본 것',
              experience.length
                ? experience.map((id) => EXPERIENCES[id].label).join(', ')
                : '아직 없어요',
              'experience'
            )}
            {mode === 'goal' &&
              row('목표', hub.cases.find((item) => item.id === goal)?.title ?? '-', 'goal')}
            <label className="flex items-center gap-4 px-4 py-3">
              <span className="w-20 shrink-0 text-xs text-[var(--editorial-muted)]">경로 이름</span>
              <input
                value={name}
                placeholder={suggestedName}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 flex-1 border border-[var(--editorial-line)] bg-transparent px-3 py-2 text-sm text-[var(--editorial-ink)] outline-none placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-accent)]"
              />
            </label>
          </div>
          {preview && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  [concepts.length, `개념 (선행 ${preview.added.length}개 포함)`],
                  [knownCount, '이미 아는 개념'],
                  [
                    `${preview.minutesLeft}분`,
                    `남은 예상 시간 · 실습·스킬 ${preview.steps.length - concepts.length}개`,
                  ],
                ].map(([value, label]) => (
                  <div
                    key={String(label)}
                    className="border border-[var(--editorial-line)] px-3 py-3"
                  >
                    <b className="block text-xl font-semibold text-[var(--editorial-strong)]">
                      {value}
                    </b>
                    <span className="text-[11.5px] leading-5 text-[var(--editorial-muted)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              {preview.added.length > 0 && (
                <p className="mt-3 text-sm leading-6 text-[var(--editorial-muted)]">
                  목표에는 없지만 먼저 알아야 해서 넣은 개념:{' '}
                  <b className="text-[var(--editorial-accent)]">
                    {preview.added.map(conceptTitle).join(' · ')}
                  </b>
                </p>
              )}
            </>
          )}
        </>
      )
      break
    }
  }

  const panel = (
    <div className="mx-auto w-full max-w-[720px]">
      {adding && (
        <p className="mb-5 border border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-4 py-2.5 text-xs text-[var(--editorial-muted)]">
          새 경로 추가 중 · 하는 일과 해본 것은 지난번 답을 불러왔어요
        </p>
      )}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-[26px] font-semibold leading-snug tracking-[-0.01em] text-[var(--editorial-strong)] outline-none sm:text-[30px]"
      >
        {title}
      </h1>
      <p className="mt-2 text-[15px] leading-7 text-[var(--editorial-muted)]">{lede}</p>
      <div className="mt-7">{body}</div>
      {!persisted && (
        <p className="mt-4 text-xs text-[var(--editorial-muted)]">
          이 브라우저에 저장할 수 없어요. 새로고침하면 경로가 사라질 수 있어요.
        </p>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={back}
        className={`inline-flex items-center gap-1.5 px-1 py-2 text-sm text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)] ${index === 0 && !onExit ? 'invisible' : ''}`}
      >
        <ArrowLeft size={15} /> {index === 0 ? '나가기' : '이전'}
      </button>
      {step === 'confirm' ? (
        <button
          type="button"
          onClick={create}
          disabled={!draft}
          className="inline-flex items-center gap-2 bg-[var(--editorial-accent)] px-6 py-3 text-sm font-semibold text-[var(--editorial-paper)] hover:brightness-110 disabled:opacity-40"
        >
          경로 만들기 <ArrowRight size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={next}
          disabled={!canNext}
          className="inline-flex items-center gap-2 bg-[var(--editorial-accent)] px-6 py-3 text-sm font-semibold text-[var(--editorial-paper)] hover:brightness-110 disabled:opacity-40"
        >
          다음 <ArrowRight size={16} />
        </button>
      )}
    </div>
  )

  const progress = (
    <div className="flex items-center gap-3 text-xs text-[var(--editorial-muted)]">
      <span className="tabular-nums">
        {index + 1} / {steps.length}
      </span>
      <span className="h-1 w-28 bg-[var(--editorial-line)] sm:w-40">
        <span
          className="block h-full bg-[var(--editorial-accent)] transition-[width]"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </span>
    </div>
  )

  if (!fullscreen) {
    return (
      <section
        aria-label="내 경로 만들기"
        className="mt-6 border border-[var(--editorial-line)] px-5 py-7 sm:px-9"
      >
        <div className="mx-auto mb-7 flex max-w-[720px] justify-end">{progress}</div>
        {panel}
        <div className="mx-auto mt-8 max-w-[720px]">{footer}</div>
      </section>
    )
  }

  // 전체 화면 — 페이지 전환 애니메이션(transform) 안에서도 화면 전체를 덮도록 body 로 포털한다
  if (!mounted) return null
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="내 경로 만들기"
      className="editorial-root fixed inset-0 z-[70] flex flex-col bg-[var(--editorial-paper)] text-[var(--editorial-ink)]"
    >
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--editorial-line)] px-4 sm:px-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-accent)]">
          내 경로 만들기
        </span>
        <div className="flex items-center gap-4">
          {progress}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1 text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
            >
              나가기 <X size={14} />
            </button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-12">{panel}</div>
      <footer className="shrink-0 border-t border-[var(--editorial-line)] bg-[var(--editorial-sidebar)] px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-[720px]">{footer}</div>
      </footer>
    </div>,
    document.body
  )
}

function CheckBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border ${on ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)] text-[var(--editorial-paper)]' : 'border-[var(--editorial-line)]'}`}
    >
      {on && <Check size={12} strokeWidth={3} />}
    </span>
  )
}

/* 블록체인 지식 홈에 들어오자마자 띄우는 전체 화면 설문.
   저장된 경로가 없고 '나가기'를 누른 적 없을 때만 — 나가기는 기억하고, 이후엔 사이드바 '내 학습 경로'로 시작한다.
   기록을 읽기 전(첫 화면)에는 아무것도 그리지 않는다. */
export function KnowledgeOnboarding({
  hub,
  onCreated,
}: {
  hub: HubData
  onCreated: (pathId: string) => void
}) {
  const { state } = useLearner()
  if (!state || state.paths.length > 0 || state.ui.onboardingDismissed) return null
  return (
    <MyPathOnboarding
      hub={hub}
      fullscreen
      onExit={() => updateLearner(dismissOnboarding)}
      onCreated={onCreated}
    />
  )
}
