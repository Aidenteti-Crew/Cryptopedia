'use client'

import { useState } from 'react'
import type { EcosystemProject, EcosystemProjectsResponse } from '@/lib/cryptopedia-types'
import { EditorialEmpty } from './editorial-states'
import { HUB_PAGE_CLASS, HubHeader, SearchField } from './hub-shared'

function ProjectCard({ project }: { project: EcosystemProject }) {
  const url = project.websiteUrl ?? project.sourceUrl ?? project.documentationUrl
  const content = (
    <>
      <span className="block text-base font-medium text-[var(--editorial-ink)]">{project.name}</span>
      {project.description && <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">{project.description}</span>}
      {project.developer && <span className="mt-3 block text-[11px] text-[var(--editorial-muted)]">{project.developer}</span>}
      {url && <span className="mt-3 block text-xs text-[var(--editorial-accent)]">공식 페이지 ↗</span>}
    </>
  )
  const className = 'block rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5 hover:border-[var(--editorial-accent)]'
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className={className}>{content}</a> : <div className={className}>{content}</div>
}

export function ProjectDirectoryPage({ data }: { data: EcosystemProjectsResponse }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const filtered = data.items.filter((project) =>
    [project.name, project.description, project.developer, project.category]
      .some((value) => value?.toLowerCase().includes(query))
  )
  const categoryNames = [...new Set(filtered.map((project) => project.category ?? '기타'))]
    .sort((left, right) => left.localeCompare(right, 'ko'))

  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader
        eyebrow="ECOSYSTEM DIRECTORY / AVALANCHE"
        title="체인·프로젝트"
        description="Avalanche 생태계 프로젝트를 공식 디렉터리 기준으로 살펴보세요."
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--editorial-muted)]">
        <span>{data.total}개 프로젝트 · {data.categories.length}개 분야</span>
        <span>프로젝트 공식 출처 연결</span>
      </div>
      <div className="mt-5"><SearchField value={search} onChange={setSearch} placeholder="프로젝트·분야 검색" /></div>
      {categoryNames.length ? categoryNames.map((category) => {
        const projects = filtered.filter((project) => (project.category ?? '기타') === category)
        return (
          <section key={category} className="mt-9" aria-label={category}>
            <h2 className="border-b border-[var(--editorial-line)] pb-3 text-lg">{category} <span className="ml-2 text-xs text-[var(--editorial-muted)]">{projects.length}</span></h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
            </div>
          </section>
        )
      }) : <div className="mt-8"><EditorialEmpty message={data.total ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'} /></div>}
    </article>
  )
}
