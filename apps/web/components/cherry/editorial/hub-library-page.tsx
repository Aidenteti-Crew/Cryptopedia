'use client'

import { useEffect, useMemo, useState } from 'react'
import { type HubData, type HubItem } from '@/lib/cryptopedia-hub'
import {
  ConceptChips,
  HUB_BUTTON_CLASS,
  HUB_PAGE_CLASS,
  HubHeader,
  RelatedLinks,
  ScopeBadge,
  SearchField,
} from './hub-shared'
import {
  INTRO_ROUTE,
  LearningMap,
  LearningMapLegend,
  layoutLearningMap,
  neighborhood,
} from './learning-map'

const PAGES: Record<string, { title: string; description: string }> = {
  practice: {
    title: '케이스별 실습',
    description:
      '만들고 싶은 결과물을 고르세요. 같은 케이스를 사람이 학습하고 에이전트가 활용할 수 있습니다.',
  },
  'skill-library': {
    title: '스킬 라이브러리',
    description: '지침·입력·결과물·완료 조건을 확인하고 작업에 맞는 스킬을 받으세요.',
  },
  'official-docs': {
    title: '공식 문서',
    description:
      'Avalanche Docs·Academy·ACP를 목적에 맞게 찾아보고, 요약과 원문을 함께 확인합니다. 절차 자료의 확인 상태도 표시합니다.',
  },
  'code-reference': {
    title: '코드·도구 레퍼런스',
    description: '공통 EVM 도구와 체인별 개발 자료를 실습으로 연결합니다.',
  },
  'builder-articles': {
    title: '빌더 아티클',
    description: '공식 자료를 이해하고 실제 목적에 적용하는 큐레이션 가이드입니다.',
  },
  'mcp-tools': {
    title: 'MCP·에이전트 도구',
    description: '공식 조회 도구의 지원 범위와 연결 방법을 확인하세요.',
  },
  glossary: {
    title: '핵심 용어 사전',
    description: '블록체인 공통 개념에서 체인별 구조로 이어지는 관계를 탐색합니다.',
  },
  'skill-graph': {
    title: '학습 지도',
    description:
      '개념을 고르면 먼저 알아야 할 개념과 다음 개념, 이어지는 실습과 에이전트 스킬이 보입니다.',
  },
}

export function HubLibraryPage({
  id,
  data,
  onOpen,
}: {
  id: string
  data: HubData
  onOpen: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')
  const [showRoute, setShowRoute] = useState(false)
  const [conceptId, setConceptId] = useState(
    () =>
      data.concepts.find((item) => item.id === 'concept-primary-network')?.id ??
      data.concepts[0]?.id ??
      ''
  )
  // 핵심 개념 페이지의 '학습 지도에서 위치 보기'는 ?concept= 로 시작 개념을 넘긴다
  useEffect(() => {
    if (id !== 'skill-graph') return
    const requested = new URLSearchParams(window.location.search).get('concept')
    if (requested && data.concepts.some((item) => item.id === requested)) setConceptId(requested)
  }, [id, data])
  const page = PAGES[id]
  let items: HubItem[] = []
  switch (id) {
    case 'practice':
      items = data.cases
      break
    case 'skill-library':
      items = data.skills
      break
    case 'glossary':
      items = data.concepts
      break
    case 'official-docs':
      items = data.resources.filter((item) => item.kind === 'DOCS' || item.kind === 'COURSE')
      break
    case 'code-reference':
      items = data.resources.filter((item) => item.kind === 'CODE')
      break
    case 'builder-articles':
      items = data.resources.filter((item) => item.kind === 'ARTICLE')
      break
    case 'mcp-tools':
      items = [
        ...data.resources.filter((item) => item.kind === 'TOOL'),
        ...data.skills.filter((item) => item.type === 'mcp'),
      ]
      break
  }
  const filtered = items.filter(
    (item) =>
      (scope === 'all' || item.scope.kind === scope) &&
      `${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase())
  )
  const concept = data.concepts.find((item) => item.id === conceptId)
  const mapLayout = useMemo(() => layoutLearningMap(data.concepts), [data.concepts])
  const nearby = neighborhood(mapLayout, conceptId)
  const introRoute = INTRO_ROUTE.filter((routeId) => mapLayout.nodes.has(routeId))
  const fundamentalsCourse = data.resources.find(
    (item) => item.id === 'resource-avalanche-fundamentals-course'
  )
  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader title={page.title} description={page.description} />
      {id === 'skill-graph' ? (
        <>
          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="지도 보기"
          >
            {[
              [false, '전체 지도'],
              [true, '입문 경로'],
            ].map(([value, label]) => (
              <button
                key={String(label)}
                type="button"
                aria-pressed={showRoute === value}
                onClick={() => {
                  setShowRoute(value as boolean)
                  if (value && introRoute[0]) setConceptId(introRoute[0])
                }}
                className={`${HUB_BUTTON_CLASS} ${showRoute === value ? 'border-[var(--editorial-accent)] text-[var(--editorial-accent)]' : ''}`}
              >
                {label}
              </button>
            ))}
            {showRoute && (
              <p className="ml-1 text-xs leading-6 text-[var(--editorial-muted)]">
                Primary Network에서 L1 Validator까지 {introRoute.length}단계 ·{' '}
                {fundamentalsCourse && (
                  <button
                    type="button"
                    onClick={() => onOpen(fundamentalsCourse.id)}
                    className="text-[var(--editorial-accent)] hover:underline"
                  >
                    공식 Avalanche Fundamentals 과정과 함께 보기 →
                  </button>
                )}
              </p>
            )}
          </div>
          <LearningMap
            layout={mapLayout}
            selected={conceptId}
            route={showRoute ? introRoute : null}
            onSelect={setConceptId}
          />
          <LearningMapLegend route={showRoute} />
          {concept && (
            <section className="mt-8 grid gap-8 border-t border-[var(--editorial-line)] pt-7 lg:grid-cols-[1fr_300px]">
              <div>
                <ScopeBadge scope={concept.scope} />
                <h2 className="mt-4 text-2xl">{concept.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">
                  {concept.body}
                </p>
                <button
                  type="button"
                  onClick={() => onOpen(concept.id)}
                  className={`${HUB_BUTTON_CLASS} mt-4`}
                >
                  개념 상세 →
                </button>
              </div>
              <div className="space-y-5 text-sm">
                {[
                  ['먼저 알아야 할 개념', [...nearby.before]],
                  ['다음 개념', [...nearby.after]],
                ].map(([title, ids]) => (
                  <div key={title as string}>
                    <h3 className="text-xs text-[var(--editorial-muted)]">{title as string}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(ids as string[]).length ? (
                        (ids as string[]).map((nearId) => (
                          <button
                            key={nearId}
                            type="button"
                            onClick={() => setConceptId(nearId)}
                            className="border border-[var(--editorial-line)] px-2.5 py-1 text-xs hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
                          >
                            {mapLayout.nodes.get(nearId)?.concept.title}
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--editorial-muted)]">없음</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {concept && (
            <>
              <RelatedLinks
                title="이 개념을 활용하는 실습"
                ids={concept.caseIds}
                data={data}
                onOpen={onOpen}
              />
              <RelatedLinks
                title="이어지는 에이전트 스킬"
                ids={concept.skillIds}
                data={data}
                onOpen={onOpen}
              />
            </>
          )}
        </>
      ) : (
        <>
          <SearchField value={search} onChange={setSearch} placeholder={`${page.title} 검색`} />
          <div className="mt-4 flex flex-wrap gap-2" aria-label="적용 범위 필터">
            {[
              ['all', '전체'],
              ['CHAIN', '체인 전용'],
              ['EVM', 'EVM 공통'],
              ['BLOCKCHAIN', '블록체인 공통'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
                className={`${HUB_BUTTON_CLASS} text-xs ${scope === value ? 'border-[var(--editorial-accent)] text-[var(--editorial-accent)]' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs text-[var(--editorial-muted)]">
            {filtered.length}개 자료 · 출처와 적용 범위를 각각 확인하세요.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] hover:border-[var(--editorial-accent)]"
              >
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="flex flex-1 flex-col items-start p-5 text-left"
                >
                  <ScopeBadge scope={item.scope} />
                  {'kind' in item && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[var(--editorial-muted)]">
                      <span className="rounded border border-[var(--editorial-line)] px-2 py-1">
                        {item.kind === 'COURSE'
                          ? '공식 강의'
                          : item.kind === 'DOCS'
                            ? '공식 문서'
                            : item.kind}
                      </span>
                      {item.sourceIds.flatMap((sourceId) => {
                        const source = data.sources.find((entry) => entry.id === sourceId)
                        if (!source) return []
                        return [
                          <span key={source.id}>
                            {source.reviewStatus === 'COMPARE_REQUIRED'
                              ? '내용 대조 필요'
                              : source.checkedAt
                                ? `출처 확인 ${source.checkedAt}`
                                : null}
                          </span>,
                        ]
                      })}
                    </div>
                  )}
                  <h2 className="mt-4 text-lg">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">
                    {item.summary}
                  </p>
                  {'minutes' in item && (
                    <span className="mt-3 block text-xs text-[var(--editorial-muted)]">
                      {item.level === 'BEGINNER' ? '입문' : '중급'} · 예상 {item.minutes}분
                    </span>
                  )}
                  <span className="mt-5 block text-xs text-[var(--editorial-accent)]">
                    {'steps' in item ? '학습·스킬 묶음 살펴보기' : '내용과 연결 자료 보기'} →
                  </span>
                </button>
                {'environment' in item && (
                  <ConceptChips
                    ids={item.conceptIds}
                    data={data}
                    onOpen={onOpen}
                    className="border-t border-[var(--editorial-line)] px-5 py-3"
                  />
                )}
              </div>
            ))}
          </div>
          {!filtered.length && (
            <p className="mt-7 text-sm text-[var(--editorial-muted)]">
              조건에 맞는 자료가 없습니다. 검색어나 적용 범위를 바꿔보세요.
            </p>
          )}
        </>
      )}
    </article>
  )
}
