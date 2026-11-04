'use client'

import { useMemo } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import { scopeLabel, type HubData } from '@/lib/cryptopedia-hub'
import { activePathOf, setProgress } from '@/lib/learner/actions'
import { computeRoute, prerequisitesOf } from '@/lib/learner/route'
import { readCompletedCases } from '@/lib/learner/store'
import { ROLES } from '@/lib/learner/tracks'
import { updateLearner, useLearner } from '@/lib/learner/use-learner'

import { HUB_PAGE_CLASS, MATERIAL_LABEL, ORIGIN_LABEL, RelatedLinks } from './hub-shared'

/* 핵심 개념 상세 — 읽는 순서대로: 태그 · 제목 · 리드 → 먼저 읽으면 좋아요 → 핵심 포인트(근거 번호) →
   지금 상태 → 누구에게 해당하나요 → 내 경로에서 완료 → 연결 자료.
   오른쪽 칸은 근거(출처) 목록과 연결 규칙. 구조화 필드(lede·points·audience)가 없으면 body 문단으로 보여 준다. */

type Concept = HubData['concepts'][number]

export const CONCEPT_SKILLS_ID = 'concept-skills'

const LEVEL_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' } as const
const SCOPE_NOTE = {
  BLOCKCHAIN: '체인과 상관없이 통하는 개념이에요.',
  EVM: 'EVM을 쓰는 체인이면 같은 내용이에요.',
  CHAIN: '이 체인에만 해당하는 개념이에요.',
} as const

const SECTION_LABEL = 'text-xs font-semibold tracking-[0.14em] text-[var(--editorial-muted)]'
const PILL = 'inline-flex items-center border px-2.5 py-1 text-xs'

export function ConceptArticle({
  concept,
  data,
  onOpen,
  onOpenInGraph,
}: {
  concept: Concept
  data: HubData
  onOpen: (id: string) => void
  onOpenInGraph?: (conceptId: string) => void
}) {
  const { state } = useLearner()
  const byId = useMemo(() => new Map(data.concepts.map((item) => [item.id, item])), [data])
  const sources = concept.sourceIds.flatMap((id) => {
    const source = data.sources.find((item) => item.id === id)
    return source ? [source] : []
  })
  const footnote = (id: string) => concept.sourceIds.indexOf(id) + 1
  const prerequisites = concept.relations.filter(
    (relation) => relation.type === 'PREREQUISITE' && byId.has(relation.id)
  )
  const nextConcepts = data.concepts.filter((item) => prerequisitesOf(item).includes(concept.id))
  const others = concept.relations
    .filter((relation) => relation.type !== 'PREREQUISITE')
    .map((relation) => relation.id)

  // 내 경로 안에서 이 개념의 자리
  const path = state ? activePathOf(state) : null
  const route = useMemo(
    () => (state && path ? computeRoute(data, path, state, readCompletedCases(data)) : null),
    [data, path, state]
  )
  const stepIndex = route?.steps.findIndex((step) => step.id === concept.id) ?? -1
  const step = stepIndex >= 0 ? route!.steps[stepIndex] : null
  const nextStep = route?.steps.slice(stepIndex + 1).find((item) => !item.status) ?? null
  const myRole = state?.profile.role ?? null

  const checked = sources
    .map((source) => source.checkedAt)
    .filter(Boolean)
    .sort()
  const needsCompare = sources.some((source) => source.reviewStatus === 'COMPARE_REQUIRED')
  const depth = (() => {
    const seen = new Set<string>()
    const walk = (id: string): number => {
      const item = byId.get(id)
      if (!item || seen.has(id)) return 0
      seen.add(id)
      const pre = prerequisitesOf(item)
      return pre.length ? Math.max(...pre.map(walk)) + 1 : 0
    }
    return walk(concept.id)
  })()
  const draft = concept.contentStatus === 'DRAFT'
  const now = () => new Date().toISOString()

  return (
    <article className={HUB_PAGE_CLASS}>
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={`${PILL} border-[var(--editorial-line)] text-[var(--editorial-ink)]`}>
              {scopeLabel(concept.scope)}
            </span>
            {draft && (
              <span className={`${PILL} border-[#d8b98a] text-[#8a5a1a]`}>
                체이너리 초안 · 검토 중
              </span>
            )}
            {step && route && (
              <span
                className={`${PILL} border-[var(--editorial-accent)] text-[var(--editorial-accent)]`}
              >
                내 경로 {stepIndex + 1} / {route.steps.length}단계
              </span>
            )}
          </div>
          <h1 className="editorial-detail-title mt-6 text-[34px] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--editorial-strong)] sm:text-[44px]">
            {concept.title}
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-[1.75] text-[var(--editorial-ink)] sm:text-xl">
            {concept.lede ?? concept.summary}
          </p>

          {prerequisites.length > 0 && (
            <section
              aria-label="먼저 읽으면 좋아요"
              className="mt-10 border-t border-[var(--editorial-line)] pt-8"
            >
              <span
                className={`${PILL} border-[var(--editorial-accent)] text-[var(--editorial-accent)]`}
              >
                먼저 읽으면 좋아요
              </span>
              <div className="mt-4 divide-y divide-[var(--editorial-line)]">
                {prerequisites.map((relation) => {
                  const pre = byId.get(relation.id)!
                  const known = state?.progress[pre.id]?.status
                  return (
                    <button
                      key={pre.id}
                      type="button"
                      onClick={() => onOpen(pre.id)}
                      className="group flex w-full items-start gap-6 py-4 text-left first:pt-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-semibold text-[var(--editorial-strong)] group-hover:text-[var(--editorial-accent)]">
                          {pre.title}: {pre.summary.replace(/\.$/, '')}
                          {(known === 'done' || known === 'known') && (
                            <span className="ml-2 align-middle text-xs font-normal text-[var(--editorial-muted)]">
                              ✓ 이미 봤어요
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block text-sm leading-7 text-[var(--editorial-muted)]">
                          {relation.reason ??
                            `${pre.title}을(를) 알고 나면 이 개념이 더 잘 이해돼요.`}
                        </span>
                      </span>
                      <ArrowRight
                        size={20}
                        className="mt-1 shrink-0 text-[var(--editorial-accent)] transition-transform group-hover:translate-x-1"
                      />
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section aria-labelledby="concept-points" className="mt-12">
            <h2 id="concept-points" className={SECTION_LABEL}>
              핵심 포인트
            </h2>
            {concept.points?.length ? (
              <ul className="mt-5 space-y-4">
                {concept.points.map((point) => (
                  <li
                    key={point.text}
                    className="flex gap-3 text-[17px] leading-8 text-[var(--editorial-ink)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[13px] h-1.5 w-1.5 shrink-0 bg-[var(--editorial-accent)]"
                    />
                    <span className="min-w-0">
                      {point.text}
                      {point.sourceIds.map((id) => (
                        <sup
                          key={id}
                          className="ml-0.5 text-[11px] font-semibold text-[var(--editorial-accent)]"
                        >
                          <a
                            href={`#concept-source-${footnote(id)}`}
                            aria-label={`근거 ${footnote(id)}`}
                          >
                            {footnote(id)}
                          </a>
                        </sup>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-[17px] leading-8 text-[var(--editorial-ink)]">
                {concept.body}
              </p>
            )}
          </section>

          <section aria-labelledby="concept-status" className="mt-12">
            <h2 id="concept-status" className={SECTION_LABEL}>
              지금 상태
            </h2>
            <dl className="mt-5 border border-[var(--editorial-line)] bg-[var(--editorial-surface)]">
              {[
                ['적용 범위', scopeLabel(concept.scope), SCOPE_NOTE[concept.scope.kind]],
                [
                  '출처 확인',
                  `출처 ${sources.length}개${checked.length ? ` · 마지막 확인 ${checked.at(-1)}` : ''}`,
                  needsCompare
                    ? '일부 출처는 내용 대조가 필요해요.'
                    : checked.length
                      ? '확인 날짜는 출처마다 오른쪽 근거 목록에 있어요.'
                      : '확인 날짜가 기록되지 않았어요.',
                ],
                [
                  '내용 상태',
                  draft
                    ? '체이너리 초안'
                    : concept.contentStatus === 'REVIEWED'
                      ? '검토 완료'
                      : '원문 요약',
                  draft
                    ? '출처의 문장을 다시 정리했어요. 사람이 검토하기 전이에요.'
                    : '공식 출처를 바탕으로 정리했어요.',
                ],
                [
                  '학습 지도',
                  depth === 0 ? '출발 개념' : `${depth}단계`,
                  depth === 0
                    ? '먼저 알아야 할 개념이 없어요.'
                    : `먼저 알아야 할 개념을 ${depth}단계 거쳐요.`,
                ],
              ].map(([label, value, note]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-[var(--editorial-line)] px-5 py-4 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-6"
                >
                  <dt className="text-sm text-[var(--editorial-muted)]">{label}</dt>
                  <dd>
                    <span className="block text-[15px] text-[var(--editorial-ink)]">{value}</span>
                    <span className="mt-1 block text-[13px] text-[var(--editorial-muted)]">
                      {note}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {concept.audience?.length ? (
            <section aria-labelledby="concept-audience" className="mt-12">
              <h2 id="concept-audience" className={SECTION_LABEL}>
                누구에게 해당하나요{' '}
                <span className="font-normal tracking-normal">· 체이너리 해석</span>
              </h2>
              <div className="mt-4 border-t border-[var(--editorial-line)]">
                {concept.audience.map((row) => {
                  const mine = row.role === myRole
                  return (
                    <div
                      key={row.role}
                      className={`grid gap-1 border-b border-[var(--editorial-line)] py-4 sm:grid-cols-[180px_1fr] sm:gap-6 ${mine ? 'bg-[var(--editorial-hover)] px-4 shadow-[inset_3px_0_0_var(--editorial-accent)]' : ''}`}
                    >
                      <span className="text-[15px] font-semibold text-[var(--editorial-strong)]">
                        {ROLES[row.role].label}
                        {mine && (
                          <span className="ml-2 text-[11px] font-normal text-[var(--editorial-accent)]">
                            내 역할
                          </span>
                        )}
                      </span>
                      <span className="text-[15px] text-[var(--editorial-ink)]">
                        {LEVEL_LABEL[row.level]}. {row.note}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {step && route && (
            <section
              aria-label="내 경로에서 이 개념"
              className="mt-12 border border-[var(--editorial-accent)] bg-[var(--editorial-surface)] p-5 sm:p-6"
            >
              {step.status ? (
                <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--editorial-strong)]">
                  <Check size={18} className="text-[var(--editorial-accent)]" />
                  {step.status === 'known' ? '이미 아는 개념으로 표시했어요' : '이 개념을 마쳤어요'}
                </p>
              ) : (
                <>
                  <p className="text-[15px] font-semibold text-[var(--editorial-strong)]">
                    이 개념, 이해하셨나요?
                  </p>
                  <p className="mt-1 text-sm text-[var(--editorial-muted)]">
                    표시하면 학습 지도에 ✓가 생기고 다음 단계로 넘어가요.
                  </p>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {step.status ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateLearner((current) =>
                        setProgress(
                          current,
                          concept.id,
                          step.status === 'known' ? 'todo' : null,
                          now()
                        )
                      )
                    }
                    className="border border-[var(--editorial-line)] px-4 py-2.5 text-sm text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)]"
                  >
                    {step.status === 'known' ? '아직 몰라요' : '완료 취소'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        updateLearner((current) => setProgress(current, concept.id, 'done', now()))
                      }
                      className="inline-flex items-center gap-2 bg-[var(--editorial-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--editorial-on-accent)] hover:brightness-110"
                    >
                      다 읽었어요 <Check size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateLearner((current) => setProgress(current, concept.id, 'known', now()))
                      }
                      className="border border-[var(--editorial-line)] px-4 py-2.5 text-sm text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)]"
                    >
                      이미 알아요
                    </button>
                  </>
                )}
                {nextStep && step.status && (
                  <button
                    type="button"
                    onClick={() => onOpen(nextStep.kind === 'screen' ? 'my-path' : nextStep.id)}
                    className="inline-flex items-center gap-2 bg-[var(--editorial-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--editorial-on-accent)] hover:brightness-110"
                  >
                    다음: {nextStep.title} <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </section>
          )}

          <RelatedLinks title="연결된 개념" ids={others} data={data} onOpen={onOpen} />
          <RelatedLinks
            title="이 개념을 사용하는 실습"
            ids={concept.caseIds}
            data={data}
            onOpen={onOpen}
          />
          <div id={CONCEPT_SKILLS_ID} className="scroll-mt-24">
            <RelatedLinks
              title="이 개념이 들어간 에이전트 스킬"
              ids={concept.skillIds}
              data={data}
              onOpen={onOpen}
            />
          </div>
          <RelatedLinks title="참고 자료" ids={concept.resourceIds} data={data} onOpen={onOpen} />
        </div>

        <aside
          aria-label="근거와 연결"
          className="min-w-0 lg:sticky lg:top-8 lg:self-start lg:pt-12"
        >
          <p className="text-[13px] text-[var(--editorial-muted)]">출처 → 개념 연결</p>
          <ol className="mt-4 divide-y divide-[var(--editorial-line)]">
            {sources.map((source, index) => (
              <li
                key={source.id}
                id={`concept-source-${index + 1}`}
                className="scroll-mt-24 py-4 first:pt-0"
              >
                <p className="text-xs text-[var(--editorial-muted)]">근거 {index + 1}</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 block text-[15px] font-semibold text-[var(--editorial-strong)] hover:text-[var(--editorial-accent)]"
                >
                  <span className="mr-1 text-[var(--editorial-accent)]">{index + 1}</span>
                  {source.name} ↗
                </a>
                <p className="mt-1.5 text-[13px] leading-6 text-[var(--editorial-muted)]">
                  {[
                    ORIGIN_LABEL[source.origin],
                    source.materialType && MATERIAL_LABEL[source.materialType],
                    source.checkedAt && `확인 ${source.checkedAt}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {source.reviewStatus === 'COMPARE_REQUIRED' && (
                    <span className="block text-[#8a5a1a]">내용 대조 필요</span>
                  )}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-2 border-t border-[var(--editorial-line)] pt-5">
            <p className="text-xs tracking-[0.14em] text-[var(--editorial-muted)]">연결 규칙</p>
            <p className="mt-3 text-[13px] leading-6 text-[var(--editorial-muted)]">
              {prerequisites.length ? (
                <>
                  <b className="text-[var(--editorial-ink)]">
                    {prerequisites.map((relation) => byId.get(relation.id)!.title).join(' · ')}
                  </b>{' '}
                  다음에 읽는 개념이에요.{' '}
                </>
              ) : (
                '먼저 알아야 할 개념 없이 시작할 수 있어요. '
              )}
              {nextConcepts.length > 0 && (
                <>
                  이 개념을 알면{' '}
                  <b className="text-[var(--editorial-ink)]">
                    {nextConcepts.map((item) => item.title).join(' · ')}
                  </b>
                  (으)로 이어져요.
                </>
              )}
            </p>
          </div>

          <div className="mt-6 grid gap-2">
            {onOpenInGraph && (
              <button
                type="button"
                onClick={() => onOpenInGraph(concept.id)}
                className="flex items-center gap-2 border border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-4 py-3 text-left text-sm hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
              >
                <ArrowLeft size={15} /> 학습 지도에서 위치 보기
              </button>
            )}
            {concept.skillIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(CONCEPT_SKILLS_ID)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="flex items-center justify-between gap-2 border border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-4 py-3 text-left text-sm hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
              >
                이 개념이 들어간 스킬 받기 <ArrowRight size={15} />
              </button>
            )}
          </div>
        </aside>
      </div>
    </article>
  )
}
