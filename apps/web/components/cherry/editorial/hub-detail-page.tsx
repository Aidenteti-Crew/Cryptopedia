'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Download } from 'lucide-react'

import {
  SKILL_PRINCIPLES,
  asConceptPage,
  buildSkillMarkdown,
  findHubItem,
  type HubData,
} from '@/lib/cryptopedia-hub'
import { ConceptRoadmap } from '../concept-reader-page'
import { CaseStudyPage } from './case-study-page'
import {
  ConceptChips,
  HUB_BUTTON_CLASS,
  HUB_PAGE_CLASS,
  HubHeader,
  RelatedLinks,
  ScopeBadge,
  SourceList,
  downloadMarkdown,
} from './hub-shared'

const CONCEPT_SKILLS_ID = 'concept-skills'

export function HubDetailPage({
  id,
  data,
  onOpen,
  onOpenInGraph,
}: {
  id: string
  data: HubData
  onOpen: (id: string) => void
  /* 학습 지도를 이 개념이 선택된 상태로 연다 */
  onOpenInGraph?: (conceptId: string) => void
}) {
  const [notice, setNotice] = useState('')
  const study = data.cases.find((item) => item.id === id)
  if (study) return <CaseStudyPage key={study.id} study={study} data={data} onOpen={onOpen} />

  const item = findHubItem(data, id)
  if (!item)
    return (
      <article className={HUB_PAGE_CLASS}>
        <p className="mt-6">현재 체인에서 제공하는 자료가 아닙니다.</p>
      </article>
    )
  const project = data.projects.find((entry) => entry.id === id)
  const resource = data.resources.find((entry) => entry.id === id)
  const concept = data.concepts.find((entry) => entry.id === id)
  const skill = data.skills.find((entry) => entry.id === id)
  const update = data.updates.find((entry) => entry.id === id)
  const cases = skill
    ? data.cases.filter((entry) => entry.skillIds.includes(skill.id)).map((entry) => entry.id)
    : []
  const changes = data.updates
    .filter((entry) => entry.impacts.some((impact) => impact.id === id))
    .map((entry) => entry.id)
  const markdown = skill ? buildSkillMarkdown(skill, data) : ''

  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader title={item.title} description={item.summary}>
        <div className="mt-5">
          <ScopeBadge scope={item.scope} />
        </div>
      </HubHeader>
      {project && (
        <>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--editorial-muted)]">
            {project.detail}
          </p>
          <a
            href={project.website}
            target="_blank"
            rel="noopener noreferrer"
            className={`${HUB_BUTTON_CLASS} mt-4`}
          >
            공식 사이트 ↗
          </a>
          <RelatedLinks title="이해할 개념" ids={project.conceptIds} data={data} onOpen={onOpen} />
          <RelatedLinks
            title="이 도구로 시작하는 실습"
            ids={project.caseIds}
            data={data}
            onOpen={onOpen}
          />
          <RelatedLinks
            title="연결된 에이전트 스킬"
            ids={project.skillIds}
            data={data}
            onOpen={onOpen}
          />
          <RelatedLinks title="참고 자료" ids={project.resourceIds} data={data} onOpen={onOpen} />
        </>
      )}
      {resource && (
        <>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--editorial-muted)]">
            {resource.body}
          </p>
          <RelatedLinks title="관련 개념" ids={resource.conceptIds} data={data} onOpen={onOpen} />
          <RelatedLinks
            title="이 자료를 사용하는 실습"
            ids={resource.caseIds}
            data={data}
            onOpen={onOpen}
          />
          <RelatedLinks title="에이전트 스킬" ids={resource.skillIds} data={data} onOpen={onOpen} />
          <RelatedLinks
            title="프로젝트·도구"
            ids={resource.projectIds}
            data={data}
            onOpen={onOpen}
          />
        </>
      )}
      {concept && (
        <>
          {/* 같은 개념이 사람의 학습 경로와 에이전트 스킬 양쪽에서 쓰인다는 걸 보여주는 두 출구 */}
          <nav aria-label="이 개념으로 이어지는 길" className="mt-6 grid gap-3 sm:grid-cols-2">
            {onOpenInGraph && (
              <button
                type="button"
                onClick={() => onOpenInGraph(concept.id)}
                className="group rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-4 text-left hover:border-[var(--editorial-accent)]"
              >
                <span className="flex items-center gap-2 text-sm group-hover:text-[var(--editorial-accent)]">
                  <ArrowLeft size={15} />
                  학습 지도에서 위치 보기
                </span>
                <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">
                  사람 · 먼저 알아야 할 개념과 다음 개념
                </span>
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
                className="group rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-4 text-left hover:border-[var(--editorial-accent)] sm:text-right"
              >
                <span className="flex items-center gap-2 text-sm group-hover:text-[var(--editorial-accent)] sm:justify-end">
                  이 개념이 들어간 스킬 받기
                  <ArrowRight size={15} />
                </span>
                <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">
                  에이전트 · 스킬 {concept.skillIds.length}개
                </span>
              </button>
            )}
          </nav>
          <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_240px]">
            <div>
              <h2 className="text-lg">개념 이해</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--editorial-muted)]">{concept.body}</p>
              <RelatedLinks
                title="연결된 개념"
                ids={concept.relations.map((relation) => relation.id)}
                data={data}
                onOpen={onOpen}
              />
            </div>
            <aside className="rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-4">
              <ConceptRoadmap
                doc={asConceptPage(concept, data)}
                appearance="editorial"
                onOpenConcept={onOpen}
              />
            </aside>
          </div>
          <RelatedLinks title="참고 자료" ids={concept.resourceIds} data={data} onOpen={onOpen} />
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
        </>
      )}
      {skill && (
        <>
          <ConceptChips ids={skill.conceptIds} data={data} onOpen={onOpen} className="mt-6" />
          <section className="mt-7 rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5">
            <p className="text-[11px] text-[var(--editorial-accent)]">
              {skill.type.toUpperCase()} / 적용 환경
            </p>
            <p className="mt-3 text-sm leading-7">{skill.environment}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h2 className="text-base">필요한 입력</h2>
                <ul className="mt-3 list-inside list-disc text-sm leading-7 text-[var(--editorial-muted)]">
                  {skill.inputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-base">기대 결과물</h2>
                <ul className="mt-3 list-inside list-disc text-sm leading-7 text-[var(--editorial-muted)]">
                  {skill.outputs.map((output) => (
                    <li key={output}>{output}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
          <section className="mt-7">
            <h2 className="text-lg">작업 지침</h2>
            <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5 text-sm leading-7">
              {skill.content}
            </pre>
          </section>
          <section className="mt-7">
            <h2 className="text-base">완료 확인</h2>
            <ul className="mt-3 list-inside list-disc text-sm leading-7 text-[var(--editorial-muted)]">
              {skill.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </section>
          <section className="mt-7">
            <h2 className="text-base">작업 원칙</h2>
            <p className="mt-2 text-xs text-[var(--editorial-muted)]">
              모든 스킬에 공통으로 적용됩니다.
            </p>
            <ul className="mt-3 list-inside list-disc text-sm leading-7 text-[var(--editorial-muted)]">
              {SKILL_PRINCIPLES.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </section>
          <button
            type="button"
            onClick={() => {
              downloadMarkdown(`${skill.id}-SKILL.md`, markdown)
              setNotice(
                '스킬 파일 다운로드를 요청했습니다. 적용 환경과 지침을 검토한 뒤 에이전트에서 사용하세요.'
              )
            }}
            className={`${HUB_BUTTON_CLASS} mt-6`}
          >
            <Download size={16} />
            스킬 파일 받기
          </button>
          <p role="status" className="mt-3 text-xs leading-6 text-[var(--editorial-accent)]">
            {notice}
          </p>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm text-[var(--editorial-muted)]">
              다운로드 파일 미리보기
            </summary>
            <pre className="mt-3 max-h-[400px] overflow-auto whitespace-pre-wrap break-words border border-[var(--editorial-line)] p-4 text-xs leading-6">
              {markdown}
            </pre>
          </details>
          <RelatedLinks
            title="함께 사용할 자료"
            ids={skill.resourceIds}
            data={data}
            onOpen={onOpen}
          />
          <RelatedLinks
            title="먼저 알아둘 개념"
            ids={skill.conceptIds}
            data={data}
            onOpen={onOpen}
          />
          <RelatedLinks title="이 스킬을 사용하는 케이스" ids={cases} data={data} onOpen={onOpen} />
        </>
      )}
      {update && (
        <>
          <p className="mt-5 text-xs text-[var(--editorial-accent)]">
            예시 날짜 {update.date.slice(0, 10)} · 실제 릴리스 공지가 아닌 변경 영향 데모
          </p>
          <section className="mt-6">
            <h2 className="text-lg">무엇이 바뀌었나</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">{update.change}</p>
          </section>
          <section className="mt-6">
            <h2 className="text-lg">확인할 행동</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">{update.action}</p>
          </section>
          <section className="mt-7">
            <h2 className="text-lg">영향받는 지식·실습·스킬</h2>
            <div className="mt-4 space-y-3">
              {update.impacts.flatMap((impact) => {
                const affected = findHubItem(data, impact.id)
                return affected
                  ? [
                      <button
                        key={impact.id}
                        type="button"
                        onClick={() => onOpen(impact.id)}
                        className="w-full rounded-lg border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-4 text-left hover:border-[var(--editorial-accent)]"
                      >
                        <span className="text-sm">{affected.title} →</span>
                        <span className="mt-2 block text-xs text-[var(--editorial-muted)]">
                          {impact.reason}
                        </span>
                      </button>,
                    ]
                  : []
              })}
            </div>
          </section>
        </>
      )}
      {!update && (
        <RelatedLinks title="관련 변경 시나리오" ids={changes} data={data} onOpen={onOpen} />
      )}
      <SourceList ids={item.sourceIds} data={data} />
    </article>
  )
}
