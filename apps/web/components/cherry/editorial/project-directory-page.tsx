'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Layers3, LayoutGrid, List, X } from 'lucide-react'
import type { EcosystemProject, EcosystemProjectsResponse } from '@/lib/cryptopedia-types'
import { filterProjects } from '@/lib/editorial-discovery'
import { EditorialEmpty } from './editorial-states'
import { HUB_PAGE_CLASS } from './hub-shared'
import {
  DiscoveryHeader,
  DiscoveryToolbar,
  DiscoverySearch,
  DiscoveryFilter,
} from './discovery-controls'
import { DiscoveryFilterPanel, DiscoveryCheckboxGroup, DiscoveryResults } from './discovery-filters'
import { useDiscoveryState, DiscoveryScrollRestore, useDiscoveryView } from './discovery-state'
import { projectCategoryStyle } from '@/lib/project-category-colors'

function ProjectLinks({ project }: { project: EcosystemProject }) {
  const links = [
    { label: '공식 홈페이지', url: project.websiteUrl },
    { label: '문서', url: project.documentationUrl },
  ].filter((item, index, all) => item.url && all.findIndex((v) => v.url === item.url) === index)
  if (!links.length && project.sourceUrl)
    links.push({ label: '공식 페이지', url: project.sourceUrl })
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center gap-1 text-xs text-[var(--editorial-accent)] hover:underline"
        >
          {link.label}
          <ExternalLink size={12} />
        </a>
      ))}
    </div>
  )
}

function ProjectItem({ project, list }: { project: EcosystemProject; list: boolean }) {
  const primary = project.websiteUrl ?? project.documentationUrl ?? project.sourceUrl
  const heading = (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className={`${list ? 'text-base' : 'text-lg'} break-words font-semibold leading-7`}>
        {primary ? (
          <a
            href={primary}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--editorial-accent)]"
          >
            {project.name}
          </a>
        ) : (
          project.name
        )}
      </h2>
    </div>
  )
  const footer = (
    <>
      <p className="mb-1 truncate text-xs text-[var(--editorial-muted)]">
        {project.developer ?? '개발사 미제공'}
      </p>
      <ProjectLinks project={project} />
    </>
  )
  if (list)
    return (
      <article
        data-tone="projects"
        style={projectCategoryStyle(project.category)}
        className="editorial-content-card grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_180px]"
      >
        <div className="editorial-card-meta flex items-center gap-2 sm:col-span-2">
          <Layers3 size={16} aria-hidden="true" />
          <span>{project.category ?? '기타'}</span>
        </div>
        <div className="min-w-0">
          {heading}
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--editorial-muted)] sm:line-clamp-1">
              {project.description}
            </p>
          )}
        </div>
        <div className="mt-3 min-w-0 sm:mt-0">{footer}</div>
      </article>
    )
  return (
    <article
      data-tone="projects"
      style={projectCategoryStyle(project.category)}
      className="editorial-content-card flex min-h-[240px] flex-col"
    >
      <div className="editorial-card-meta flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
          <Layers3 size={21} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 break-words text-right text-xs" title={project.category ?? '기타'}>
          {project.category ?? '기타'}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {heading}
        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--editorial-muted)]">
            {project.description}
          </p>
        )}
        <div className="mt-auto pt-4">{footer}</div>
      </div>
    </article>
  )
}

export function ProjectDirectoryPage({
  data,
  stateKey = 'projects',
}: {
  data: EcosystemProjectsResponse
  stateKey?: string
}) {
  const [search, setSearch] = useDiscoveryState(`${stateKey}:search`, '')
  const [selected, setSelected] = useDiscoveryState<string[]>(`${stateKey}:categories`, [])
  const [sort, setSort] = useDiscoveryState<'name' | 'importance'>(`${stateKey}:sort`, 'name')
  const [view, setView] = useDiscoveryView(`${stateKey}:view`, 'editorial-project-view', 'cards', [
    'cards',
    'list',
  ] as const)
  const [visible, setVisible] = useDiscoveryState(`${stateKey}:visible`, 24)
  const [categorySearch, setCategorySearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get('category')
    if (category && data.items.some((project) => project.category === category)) {
      setSelected([category])
      setVisible(24)
    }
  }, [data, setSelected, setVisible])
  const categories = useMemo(
    () =>
      data.categories
        .map((item) => ({ ...item, name: item.name === 'Uncategorized' ? '기타' : item.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [data.categories]
  )
  const filtered = useMemo(
    () =>
      filterProjects(data.items, search, selected).sort((a, b) =>
        sort === 'importance'
          ? (b.importance ?? 0) - (a.importance ?? 0) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name)
      ),
    [data.items, search, selected, sort]
  )
  const choose = (values: string[]) => {
    setSelected(values)
    setVisible(24)
    if (new URLSearchParams(window.location.search).has('category')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('category')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
    }
  }
  const reset = () => {
    setSearch('')
    choose([])
    setSort('name')
    setCategorySearch('')
    setVisible(24)
  }
  return (
    <article className={HUB_PAGE_CLASS}>
      <DiscoveryHeader
        theme="projects"
        count={data.total}
        title="체인·프로젝트"
        description="관심 있는 분야의 프로젝트와 도구를 찾아보세요."
      />
      <DiscoveryToolbar>
        <DiscoverySearch
          value={search}
          onChange={(value) => {
            setSearch(value)
            setVisible(24)
          }}
          placeholder="프로젝트명·설명·개발사 검색"
        />
      </DiscoveryToolbar>
      <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-3">
        <p className="text-sm text-[var(--editorial-muted)]">분야별 프로젝트 탐색</p>
        <DiscoveryFilterPanel
          label="분야 선택"
          count={selected.length}
          resultCount={filtered.length}
          onReset={() => choose([])}
          onOpenChange={setFilterOpen}
        >
          <label className="sr-only" htmlFor="project-category-search">
            분야 검색
          </label>
          <input
            id="project-category-search"
            type="search"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="분야 검색"
            className="mb-4 min-h-10 w-full rounded-xl border border-white/10 bg-white/[.025] px-3 text-sm outline-offset-2"
          />
          <DiscoveryCheckboxGroup
            columns
            label="프로젝트 분야"
            value={selected}
            onChange={choose}
            options={categories
              .filter((item) =>
                item.name.toLowerCase().includes(categorySearch.trim().toLowerCase())
              )
              .map((item) => ({ value: item.name, label: item.name, count: item.count }))}
          />
        </DiscoveryFilterPanel>
      </div>
      {!filterOpen && selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="선택한 분야">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => choose(selected.filter((value) => value !== name))}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#baa4df]/25 bg-[#baa4df]/10 px-3 text-xs text-[#cdbce7]"
            >
              {name}
              <X size={11} />
            </button>
          ))}
        </div>
      )}
      <DiscoveryResults
        count={filtered.length}
        description={`${new Set(filtered.map((p) => p.category ?? '기타')).size}개 분야`}
        active={!!search || !!selected.length || sort !== 'name'}
        onReset={reset}
      >
        <DiscoveryFilter
          label="정렬"
          value={sort}
          onChange={(value) => {
            setSort(value as 'name' | 'importance')
            setVisible(24)
          }}
          options={[
            { value: 'name', label: '이름순' },
            { value: 'importance', label: '중요도순' },
          ]}
        />
        <div
          role="group"
          aria-label="프로젝트 보기 방식"
          className="inline-flex gap-1 rounded-xl bg-black/15 p-1"
        >
          {(
            [
              { value: 'cards', label: '카드 보기', Icon: LayoutGrid },
              { value: 'list', label: '리스트 보기', Icon: List },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${view === value ? 'bg-[var(--editorial-accent)] text-[#15191e]' : 'text-[var(--editorial-muted)] hover:bg-white/5'}`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </DiscoveryResults>
      {sort === 'importance' && (
        <p className="mb-4 text-xs text-[var(--editorial-muted)]">
          수집 자료에 기록된 중요도를 기준으로 정렬합니다.
        </p>
      )}
      {filtered.length ? (
        <>
          <div
            className={
              view === 'cards' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'
            }
          >
            {filtered.slice(0, visible).map((project) => (
              <ProjectItem key={project.id} project={project} list={view === 'list'} />
            ))}
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 text-xs text-[var(--editorial-muted)]">
            <span>
              {Math.min(visible, filtered.length)} / {filtered.length}개 표시
            </span>
            {visible < filtered.length && (
              <button
                type="button"
                onClick={() => setVisible((value) => value + 24)}
                className="min-h-11 rounded-xl border border-white/15 px-6 text-sm text-[var(--editorial-accent)] hover:border-[var(--editorial-accent)]"
              >
                {Math.min(24, filtered.length - visible)}개 더 보기
              </button>
            )}
          </div>
        </>
      ) : (
        <EditorialEmpty
          message={
            data.total ? '검색 조건에 맞는 프로젝트가 없습니다.' : '등록된 프로젝트가 없습니다.'
          }
        />
      )}
      <DiscoveryScrollRestore stateKey={stateKey} />
    </article>
  )
}
