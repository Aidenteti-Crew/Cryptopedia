'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { BUILDER_RESULT_COPY, type BuilderTypeResult, type ChainHomeContent } from '@/lib/avalanche-home'
import { BuilderTypeSymbol } from './builder-type-symbol'
import {
  BUILDER_QUESTIONS,
  TOTAL_QUESTIONS,
  builderTestReducer,
  getBuilderTestView,
  initialBuilderTestState,
  optionsInDisplayOrder,
  type BuilderOption,
  type BuilderTypeId,
} from '@/lib/builder-test'

/* 선택 후 다음 질문으로 넘어가기 전, 선택한 항목이 잠깐 보이도록 두는 시간 */
const ADVANCE_DELAY_MS = 180

const PAGE = 'px-5 pb-10 pt-4 sm:px-8 sm:pb-12 lg:px-[52px] lg:pb-[64px]'

/* ── 질문 화면: 한 화면에 질문 하나, 선택지 4개 세로 배치 ─────────────────
   선택지는 문항마다 섞인 순서로 보여 주고, A~D 같은 알파벳은 표시하지 않는다.
   선택 상태는 보기의 "자리"가 아니라 유형 ID 로 판단하므로 되돌아와도 같은 항목이 선택돼 보인다. */
export function BuilderTestQuestion({
  step,
  options,
  selected,
  onChoose,
  onBack,
  headingRef,
}: {
  step: number
  /** 이 문항의 선택지 — 이미 표시 순서대로 정렬돼 있다 */
  options: readonly BuilderOption[]
  /** 현재 질문에서 선택(또는 선택 중)한 선택지의 유형 ID */
  selected: BuilderTypeId | null
  onChoose: (type: BuilderTypeId) => void
  onBack: () => void
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  const question = BUILDER_QUESTIONS[step]
  const position = step + 1
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--editorial-muted)]">
        FIND YOUR BUILDER TYPE
      </p>

      <div className="mt-6">
        <p className="text-[12px] tabular-nums tracking-[0.18em] text-[var(--editorial-muted)]">
          {position} / {TOTAL_QUESTIONS}
        </p>
        <div
          role="progressbar"
          aria-label="진행률"
          aria-valuemin={1}
          aria-valuemax={TOTAL_QUESTIONS}
          aria-valuenow={position}
          aria-valuetext={`${TOTAL_QUESTIONS}문항 중 ${position}번째`}
          className="mt-3 h-[2px] w-full bg-[var(--editorial-line)]"
        >
          <div
            className="h-full bg-[var(--editorial-accent)] transition-[width] duration-200"
            style={{ width: `${(position / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-10 text-[26px] font-medium leading-[1.4] tracking-[-0.3px] text-[var(--editorial-strong)] outline-none sm:text-[32px]"
      >
        {question.prompt}
      </h1>

      <ul className="mt-8 space-y-3" aria-label={`질문 ${position}의 선택지`}>
        {options.map((option) => {
          const active = selected === option.type
          return (
            <li key={option.type}>
              <button
                type="button"
                aria-pressed={active}
                data-option-type={option.type}
                onClick={() => onChoose(option.type)}
                className={`flex min-h-[60px] w-full items-center gap-4 rounded-[12px] border px-5 py-4 text-left text-[16px] leading-6 ${
                  active
                    ? 'border-[var(--editorial-accent)] bg-[var(--editorial-surface)] text-[var(--editorial-strong)]'
                    : 'border-[var(--editorial-line)] text-[var(--editorial-ink)] hover:bg-[var(--editorial-hover)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                    active
                      ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)]'
                      : 'border-[var(--editorial-muted)]'
                  }`}
                />
                <span>{option.text}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-8 min-h-10">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex min-h-10 items-center gap-2 text-[14px] text-[var(--editorial-muted)] hover:text-[var(--editorial-strong)] ${
            step === 0 ? 'invisible' : ''
          }`}
          tabIndex={step === 0 ? -1 : 0}
        >
          <ArrowLeft size={15} strokeWidth={1.8} /> 이전 질문
        </button>
      </div>
    </div>
  )
}

/* ── 동점 화면: 점수가 같은 유형들을 보여 주고 가장 관심 있는 방향을 고르게 한다 ─── */
export function BuilderTestTie({
  candidates,
  onPick,
  onBack,
  headingRef,
}: {
  /** 동점인 유형 (둘 이상) */
  candidates: readonly BuilderTypeResult[]
  onPick: (type: BuilderTypeId) => void
  onBack: () => void
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--editorial-muted)]">
        FIND YOUR BUILDER TYPE
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-10 text-[26px] font-medium leading-[1.4] tracking-[-0.3px] text-[var(--editorial-strong)] outline-none sm:text-[32px]"
      >
        가장 관심 있는 방향을 골라 주세요
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-7 text-[var(--editorial-muted)]">
        답변이 여러 방향에 고르게 나왔어요. 지금 가장 마음이 가는 쪽을 고르면 그에 맞는 탐색 경로를 보여 드려요.
      </p>

      <ul className="mt-8 space-y-3" aria-label="동점인 빌더 유형">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              data-option-type={candidate.id}
              onClick={() => onPick(candidate.id)}
              className="flex min-h-[72px] w-full items-center gap-5 rounded-[12px] border border-[var(--editorial-line)] px-5 py-4 text-left text-[var(--editorial-ink)] hover:bg-[var(--editorial-hover)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--editorial-line)] text-[var(--editorial-strong)]">
                <BuilderTypeSymbol id={candidate.id} className="h-6 w-6" />
              </span>
              <span className="block">
                <span className="block text-[17px] font-medium text-[var(--editorial-strong)]">
                  {candidate.name}
                  <span className="ml-3 text-[11px] font-semibold tracking-[0.2em] text-[var(--editorial-muted)]">
                    {candidate.label}
                  </span>
                </span>
                <span className="mt-1 block text-[14px] leading-6 text-[var(--editorial-muted)]">
                  {candidate.keywords.map((keyword) => keyword.term).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 min-h-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 text-[14px] text-[var(--editorial-muted)] hover:text-[var(--editorial-strong)]"
        >
          <ArrowLeft size={15} strokeWidth={1.8} /> 이전 질문
        </button>
      </div>
    </div>
  )
}

/* ── 결과 화면: 나의 빌더 프로필 + 맞춤형 탐색 경로 ───────────────────
   점수·퍼센트·차트는 쓰지 않는다 (4문항으로 실제 측정한 값이 아니다).
   네 유형 모두 같은 레이아웃이고, 심볼·설명·키워드·경로만 유형별로 다르다.
   · 상단 = "어떤 방식으로 배우고 만드는 사람인가" (description)
     하단 = "왜 이 콘텐츠를 추천하고 어디부터 시작하면 좋은가" (rationale) — 두 문구가 서로 반복되지 않는다.
   · Hero 는 카드가 아니라 화면 전체 폭의 아주 옅은 플럼 톤 띠 — 안쪽 콘텐츠는 960px 로 가운데 정렬하고
     히어로와 본문의 시작점을 같은 열(RESULT_WIDTH)에 맞춘다. */
const RESULT_WIDTH = 'mx-auto max-w-[960px]'

export function BuilderTestResult({
  result,
  onOpen,
  onRestart,
  headingRef,
}: {
  result: BuilderTypeResult
  onOpen: (id: string) => void
  onRestart: () => void
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  const first = result.path.find((step) => step.target)

  return (
    <div>
      {/* 상단 결과 Hero — 옅은 플럼 톤의 단색 띠 (그라데이션·큰 카드 없음) */}
      <header
        className="-mx-5 -mt-4 border-b border-[var(--editorial-line)] px-5 pb-10 pt-8 sm:-mx-8 sm:px-8 lg:-mx-[52px] lg:px-[52px] lg:pb-12 lg:pt-10"
        style={{ background: 'color-mix(in srgb, var(--editorial-paper) 92%, var(--editorial-mark))' }}
      >
        <div className={RESULT_WIDTH}>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--editorial-muted)]">
            YOUR BUILDER PROFILE
          </p>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-9">
            <span
              className="flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full border border-[var(--editorial-line)] text-[var(--editorial-strong)] sm:h-[120px] sm:w-[120px]"
              style={{ background: 'color-mix(in srgb, var(--editorial-paper) 84%, var(--editorial-mark))' }}
            >
              <BuilderTypeSymbol id={result.id} className="h-12 w-12 sm:h-16 sm:w-16" />
            </span>
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-[40px] font-medium leading-[1.15] tracking-[-0.8px] text-[var(--editorial-strong)] outline-none sm:text-[56px]"
              >
                {result.name}
              </h1>
              <p className="mt-2 text-[12px] font-semibold tracking-[0.24em] text-[var(--editorial-muted)]">
                {result.label}
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-[60ch] text-[17px] leading-[1.8] text-[var(--editorial-ink)]">
            {result.description}
          </p>
        </div>
      </header>

      <div className={RESULT_WIDTH}>
        {/* 빌더 특성 — 작은 인라인 키워드 (키워드는 밝게, 설명은 차분한 회색) */}
        <section className="mt-10" aria-labelledby="builder-result-keywords">
          <h2
            id="builder-result-keywords"
            className="text-[11px] font-semibold tracking-[0.2em] text-[var(--editorial-muted)]"
          >
            빌더 특성
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2.5">
            {result.keywords.map((keyword) => (
              <li key={keyword.term} className="break-keep text-[15px] leading-6 sm:text-[16px]">
                <span className="font-medium text-[var(--editorial-strong)]">{keyword.term}</span>
                <span className="text-[var(--editorial-muted)]"> · {keyword.note}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 추천 탐색 경로 — 01 → 02 → 03 (순서대로 이수하는 커리큘럼이 아님) */}
        <section className="mt-12" aria-labelledby="builder-result-path">
          <h2 id="builder-result-path" className="text-[24px] font-medium text-[var(--editorial-strong)]">
            {BUILDER_RESULT_COPY.pathHeading}
          </h2>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-7 text-[var(--editorial-ink)]">
            {result.rationale}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[var(--editorial-muted)]">
            {BUILDER_RESULT_COPY.pathCaption}
          </p>
          <ol className="mt-7 ml-[5px] border-l border-[var(--editorial-line)]">
            {result.path.map((step, index) => {
              const number = String(index + 1).padStart(2, '0')
              const isFirst = index === 0
              const body = (
                <>
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className={`text-xs tabular-nums ${
                        isFirst ? 'font-semibold text-[var(--editorial-accent)]' : 'text-[var(--editorial-muted)]'
                      }`}
                    >
                      {number}
                    </span>
                    <span className="text-[19px] font-medium text-[var(--editorial-strong)] group-hover:text-[var(--editorial-accent)]">
                      {step.title}
                    </span>
                    {isFirst && (
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-[var(--editorial-accent)]">
                        START HERE
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block pl-[34px] text-[14px] leading-6 text-[var(--editorial-muted)]">
                    {step.description}
                  </span>
                </>
              )
              return (
                <li key={step.title} className="relative pb-8 pl-8 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[5.5px] top-[9px] h-[10px] w-[10px] rounded-full border ${
                      isFirst
                        ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)]'
                        : 'border-[var(--editorial-muted)] bg-[var(--editorial-paper)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(step.target.id)}
                    className="group flex w-full items-start justify-between gap-4 text-left"
                  >
                    <span className="block">{body}</span>
                    <ArrowRight
                      size={18}
                      strokeWidth={1.6}
                      className="mt-1.5 shrink-0 text-[var(--editorial-muted)] group-hover:text-[var(--editorial-accent)]"
                    />
                  </button>
                </li>
              )
            })}
          </ol>

          {/* 보조 참고 자료 — 외부 공식 문서. 새 탭에서 열리며 주요 경로(위)와는 구분한다 */}
          {result.reference && (
            <p className="mt-8 text-[13px] leading-6 text-[var(--editorial-muted)]">
              <span className="font-medium">{BUILDER_RESULT_COPY.referenceHeading}</span>
              <span aria-hidden="true"> · </span>
              <a
                href={result.reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--editorial-ink)] underline decoration-[var(--editorial-line)] underline-offset-[5px] hover:text-[var(--editorial-strong)]"
              >
                {result.reference.label} ↗
              </a>
              <span> · {BUILDER_RESULT_COPY.referenceNote}</span>
            </p>
          )}
        </section>

        {/* 하단 CTA */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
          {first && (
            <button
              type="button"
              onClick={() => onOpen(first.target.id)}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-[12px] bg-[var(--editorial-accent)] px-8 text-[16px] font-medium text-[var(--editorial-paper)] hover:bg-[var(--editorial-strong)]"
            >
              {BUILDER_RESULT_COPY.startCta} <ArrowRight size={17} strokeWidth={1.8} />
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-11 items-center text-[14px] text-[var(--editorial-ink)] underline decoration-[var(--editorial-line)] underline-offset-[6px] hover:text-[var(--editorial-strong)]"
          >
            다시 테스트하기
          </button>
        </div>

        {/* 진단이 아니라는 안내 — 눈에 띄지 않게 맨 아래에 작게 */}
        <p className="mt-10 text-[11px] leading-5 text-[var(--editorial-muted)] opacity-80">
          {BUILDER_RESULT_COPY.disclaimer}
        </p>
      </div>
    </div>
  )
}

/* ── 페이지: 상태(reducer)를 들고 질문 → (동점 선택) → 결과를 전환한다 ──────── */
export function BuilderTestPage({
  content,
  onOpen,
}: {
  content: ChainHomeContent
  /** 화면·문서 id 를 연다 (홈과 같은 열기 함수) */
  onOpen: (id: string) => void
}) {
  // 표시 순서는 마운트 시 한 번 섞이고(클라이언트에서만 렌더되므로 하이드레이션 불일치 없음) 테스트가 끝날 때까지 고정된다
  const [state, dispatch] = useReducer(builderTestReducer, undefined, () => initialBuilderTestState())
  const [choosing, setChoosing] = useState<BuilderTypeId | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)
  const view = getBuilderTestView(state)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // 화면(질문·동점 선택·결과)이 바뀌면 제목으로 포커스를 옮겨 키보드·스크린리더 사용자가 새 내용을 바로 읽게 한다
  const focusKey = `${state.step}:${view.kind}`
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    headingRef.current?.focus({ preventScroll: true })
  }, [focusKey])

  const choose = (type: BuilderTypeId) => {
    if (choosing !== null) return
    setChoosing(type)
    timer.current = setTimeout(() => {
      dispatch({ type: 'answer', option: type })
      setChoosing(null)
    }, ADVANCE_DELAY_MS)
  }

  const typeResult = (id: BuilderTypeId) => content.builderTypes.find((type) => type.id === id)

  let body: React.ReactNode
  if (view.kind === 'result' && typeResult(view.type)) {
    body = (
      <BuilderTestResult
        result={typeResult(view.type)!}
        onOpen={onOpen}
        onRestart={() => dispatch({ type: 'reset' })}
        headingRef={headingRef}
      />
    )
  } else if (view.kind === 'choose') {
    body = (
      <BuilderTestTie
        candidates={view.types.map((id) => typeResult(id)).filter((type): type is BuilderTypeResult => Boolean(type))}
        onPick={(type) => dispatch({ type: 'choose', option: type })}
        onBack={() => dispatch({ type: 'back' })}
        headingRef={headingRef}
      />
    )
  } else {
    const step = Math.min(state.step, TOTAL_QUESTIONS - 1)
    body = (
      <BuilderTestQuestion
        step={step}
        options={optionsInDisplayOrder(BUILDER_QUESTIONS[step], state.orders[step])}
        selected={choosing ?? state.answers[step]}
        onChoose={choose}
        onBack={() => {
          if (choosing === null) dispatch({ type: 'back' })
        }}
        headingRef={headingRef}
      />
    )
  }

  return (
    <article className={`min-w-0 ${PAGE}`}>
      {view.kind === 'result' ? body : <div className="max-w-[720px]">{body}</div>}
    </article>
  )
}
