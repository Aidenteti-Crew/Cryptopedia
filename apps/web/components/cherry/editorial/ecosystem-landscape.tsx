'use client'

import { useState } from 'react'
import { Bot, Database, Wallet, Wrench } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { HubData } from '@/lib/cryptopedia-hub'
import { LandscapeGrid, type LandscapeCategory } from '../nd-landscape'
import { HUB_PAGE_CLASS, HubHeader, ScopeBadge, SearchField } from './hub-shared'

const CATEGORY_ICON = { wallet: Wallet, data: Database, development: Wrench, agent: Bot }

export function EcosystemLandscape({
  data,
  onOpen,
}: {
  data: HubData
  onOpen: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const projects = data.projects.filter((project) =>
    `${project.title} ${project.summary}`.toLowerCase().includes(search.toLowerCase())
  )
  const categories: LandscapeCategory[] = data.categories.flatMap((category) => {
    const items = projects.filter((project) => project.categoryId === category.id)
    return items.length
      ? [
          {
            code: category.id,
            name: category.title,
            entities: items.map((project) => ({
              name: project.title,
              desc: project.summary,
              detail: project.detail,
              url: project.website,
              stars: null,
              spotlight: false,
              emoji: '',
              meta: project.id,
            })),
          },
        ]
      : []
  })

  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader
        eyebrow="ECOSYSTEM LANDSCAPE / AVALANCHE"
        title="체인·프로젝트"
        description="Avalanche의 공식 도구와 활용 가능한 공통 도구를 분야별로 탐색하세요. 프로젝트에서 개념, 실습과 에이전트 스킬로 이어집니다."
      />
      <SearchField value={search} onChange={setSearch} placeholder="프로젝트·도구 검색" />
      <div className="mt-7">
        <LandscapeGrid
          categories={categories}
          renderCategory={(category, open) => {
            const Icon = CATEGORY_ICON[category.code as keyof typeof CATEGORY_ICON] ?? Wrench
            return (
              <button
                type="button"
                onClick={open}
                className="h-full w-full rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5 text-left hover:border-[var(--editorial-accent)]"
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} className="text-[var(--editorial-accent)]" />
                  <span className="flex-1 text-base">{category.name}</span>
                  <span className="text-xs text-[var(--editorial-muted)]">
                    {category.entities.length} ↗
                  </span>
                </span>
                <span className="mt-5 block space-y-4">
                  {category.entities.slice(0, 4).map((entity) => {
                    const project = projects.find((item) => item.id === entity.meta)!
                    return (
                      <span
                        key={project.id}
                        className="block border-t border-[var(--editorial-line)] pt-4"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm">{project.title}</span>
                          <ScopeBadge scope={project.scope} />
                        </span>
                        <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">
                          {project.summary}
                        </span>
                      </span>
                    )
                  })}
                </span>
              </button>
            )
          }}
          renderDetail={(category, close) => (
            <Dialog
              open
              onOpenChange={(open) => {
                if (!open) close()
              }}
            >
              <DialogContent
                className="editorial-root max-h-[85dvh] overflow-y-auto border-[var(--editorial-line)] text-[var(--editorial-ink)]"
                style={{ minHeight: 0, backgroundColor: 'var(--editorial-surface)' }}
              >
                <DialogHeader>
                  <DialogTitle>{category.name}</DialogTitle>
                  <DialogDescription className="text-[var(--editorial-muted)]">
                    목적에 맞는 도구를 선택하고 관련 실습과 스킬을 확인하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {category.entities.map((entity) => {
                    const project = projects.find((item) => item.id === entity.meta)!
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          close()
                          onOpen(project.id)
                        }}
                        className="w-full rounded-lg border border-[var(--editorial-line)] p-4 text-left hover:border-[var(--editorial-accent)]"
                      >
                        <ScopeBadge scope={project.scope} />
                        <span className="mt-3 block">{project.title} →</span>
                        <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">
                          {project.detail}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>
          )}
        />
      </div>
      {!categories.length && (
        <p className="mt-8 text-sm text-[var(--editorial-muted)]">
          검색 결과가 없습니다. 다른 이름이나 용도로 검색해보세요.
        </p>
      )}
      <p className="mt-8 text-xs leading-6 text-[var(--editorial-muted)]">
        실제 도구의 공식 출처를 연결한 큐레이션 데모입니다. 지원 범위는 각 도구의 현재 공식 문서에서
        확인하세요.
      </p>
    </article>
  )
}
