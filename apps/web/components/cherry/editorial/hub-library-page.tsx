'use client'

import { useState } from 'react'
import { ConceptRoadmap } from '../concept-reader-page'
import { asConceptPage, type HubData, type HubItem } from '@/lib/cryptopedia-hub'
import {
  HUB_BUTTON_CLASS,
  HUB_PAGE_CLASS,
  HubHeader,
  RelatedLinks,
  ScopeBadge,
  SearchField,
} from './hub-shared'

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
      '체인 공식 자료와 적용 가능한 공통 기술 문서를 함께 읽습니다. 출처와 적용 범위를 구분합니다.',
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
    title: '학습·스킬 그래프',
    description: '선행 개념에서 다음 실습과 에이전트 스킬까지 연결해보세요.',
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
  const [conceptId, setConceptId] = useState(data.concepts[0]?.id ?? '')
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
      items = data.resources.filter((item) => item.kind === 'DOCS')
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
  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader
        eyebrow={
          id === 'practice' || id === 'skill-graph'
            ? 'ACADEMY / LEARN & BUILD'
            : 'CONNECTED KNOWLEDGE / AVALANCHE'
        }
        title={page.title}
        description={page.description}
      />
      {id === 'skill-graph' ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {data.concepts.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === conceptId}
                onClick={() => setConceptId(item.id)}
                className={`${HUB_BUTTON_CLASS} ${item.id === conceptId ? 'border-[var(--editorial-accent)]' : ''}`}
              >
                {item.title}
              </button>
            ))}
          </div>
          {concept && (
            <div className="mt-7 grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5">
                <ConceptRoadmap
                  doc={asConceptPage(concept, data)}
                  appearance="editorial"
                  onOpenConcept={(node) => setConceptId(node)}
                />
              </div>
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
              </div>
            </div>
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
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item.id)}
                className="rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5 text-left hover:border-[var(--editorial-accent)]"
              >
                <ScopeBadge scope={item.scope} />
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
