'use client'

import { ArrowRight, BookOpen, Bot, CalendarDays, Code2, Globe2, Layers3 } from 'lucide-react'
import type { EcosystemPageData, EcosystemProjectsResponse } from '@/lib/cryptopedia-types'
import type { HubData } from '@/lib/cryptopedia-hub'
import { HeroCarousel, HERO_GRADIENTS, type OverviewHeroItem } from '../nd-overview-page'
import { getProjectHeatmapItems, sortHomeNews } from '@/lib/cryptopedia-home'
import { getChainHomeContent } from '@/lib/avalanche-home'
import { BuilderTestPage } from './builder-test-page'
import { EcosystemHomeIntro } from './ecosystem-home-intro'
import { EcosystemHeatmap } from './ecosystem-heatmap'

interface EcosystemPageProps {
  data: EcosystemPageData
  hub?: HubData
  chainId?: string
  chainLogoUrl?: string
  projects?: EcosystemProjectsResponse | null
  onOpenScreen: (id: 'projects' | 'macro' | 'events' | 'updates') => void
  onOpenProjectCategory?: (category: string | null) => void
  onOpenLatest: (id: string) => void
}

const NEWS_CATEGORIES = {
  PROJECT: { label: '체인·프로젝트', Icon: Layers3 },
  MACRO: { label: '매크로 소식', Icon: Globe2 },
  EVENT: { label: '행사·이벤트', Icon: CalendarDays },
  DEV: { label: '개발 업데이트', Icon: Code2 },
  UPDATE: { label: '개발 업데이트', Icon: Code2 },
}
const AUDIENCES = [
  {
    id: 'practice',
    title: '사람이 공부하기',
    label: 'FOR PEOPLE',
    summary: '목표에 맞는 개념을 배우고, 공식 자료와 예제를 따라 케이스별로 실습하세요.',
    action: '케이스별 실습으로',
    Icon: BookOpen,
  },
  {
    id: 'skill-library',
    title: '에이전트에게 전달하기',
    label: 'FOR AGENTS',
    summary: '필요한 지식과 스킬을 찾아 지침·출처·완료 조건이 담긴 파일로 전달하세요.',
    action: '스킬 라이브러리로',
    Icon: Bot,
  },
]

export function EcosystemPage({
  data,
  chainId = 'avalanche',
  chainLogoUrl,
  projects,
  onOpenScreen,
  onOpenProjectCategory,
  onOpenLatest,
}: EcosystemPageProps) {
  const latest = sortHomeNews(data.latest)
  const projectTiles = projects ? getProjectHeatmapItems(projects) : []
  const builderContent = getChainHomeContent(chainId)
  const slides: OverviewHeroItem[] = latest.map((entry) => ({
    n: entry.title,
    d: entry.summary,
    i: entry.id,
    topic: entry.kind,
    type: 'news',
    s: null,
    v: '',
    u: entry.sourceUrl ?? '',
    vf: 0,
  }))
  return (
    <article className="min-w-0 px-5 pb-8 pt-4 sm:px-8 lg:px-[52px] lg:pb-[52px]">
      <EcosystemHomeIntro data={data} chainId={chainId} chainLogoUrl={chainLogoUrl} />

      <div className="mt-8 grid min-w-0 items-start gap-8 lg:grid-cols-2 lg:gap-6">
        <section className="min-w-0" aria-label="생태계 최신 소식">
          {slides.length ? (
            <HeroCarousel
              items={slides}
              appearance="editorial"
              renderSlide={(slide, index) => {
                const category =
                  NEWS_CATEGORIES[slide.topic as keyof typeof NEWS_CATEGORIES] ??
                  NEWS_CATEGORIES.PROJECT
                const Icon = category.Icon
                const entry = latest[index]
                return (
                  <a
                    href={
                      entry.sourceUrl && /^https?:\/\//.test(entry.sourceUrl)
                        ? entry.sourceUrl
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex h-[520px] w-full min-w-0 flex-col overflow-hidden rounded-[20px] text-left text-white lg:h-[600px]"
                    style={{ background: HERO_GRADIENTS[index % HERO_GRADIENTS.length][0] }}
                  >
                    <span className="flex min-h-0 min-w-0 flex-1 flex-col px-7 py-8 sm:px-10">
                      <span className="flex shrink-0 flex-wrap items-center gap-3 pr-12 text-[10px] font-semibold uppercase tracking-[1.2px] text-white/75">
                        <span>{category.label}</span>
                        <span className="rounded-full border border-white/25 px-2 py-0.5 tracking-normal">
                          {entry.sourceName ?? '수집 소식'}
                        </span>
                      </span>
                      <span className="mt-14 block shrink-0 break-words text-[28px] font-semibold leading-[1.3] tracking-[-0.5px] sm:text-[34px]">
                        {slide.n}
                      </span>
                      <span className="mt-4 block min-h-0 max-w-[38ch] flex-1 overflow-y-auto overscroll-contain break-words pr-2 text-sm leading-7 text-white/80">
                        {slide.d}
                      </span>
                      <span className="mt-auto flex shrink-0 flex-wrap items-center gap-3 pt-7 text-xs text-white/80">
                        <span>
                          {entry.startsAt
                            ? '행사 ' + entry.startsAt.slice(0, 10)
                            : entry.publishedAt
                              ? '게시 ' + entry.publishedAt.slice(0, 10)
                              : '게시일 미제공'}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-2 font-semibold">
                          {entry.sourceUrl ? '원문 보기' : '원문 링크 미제공'}{' '}
                          <ArrowRight size={15} />
                        </span>
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 sm:right-8 sm:top-8"
                    >
                      <Icon size={21} strokeWidth={1.6} />
                    </span>
                  </a>
                )
              }}
            />
          ) : (
            <p className="rounded-xl border border-[var(--editorial-line)] p-6 text-sm text-[var(--editorial-muted)]">
              새 소식이 등록되면 이곳에 표시됩니다.
            </p>
          )}
        </section>
        {builderContent ? (
          <BuilderTestPage content={builderContent} onOpen={onOpenLatest} compact />
        ) : (
          <section className="rounded-[20px] border border-[var(--editorial-line)] p-6 text-sm text-[var(--editorial-muted)]">
            이 컬렉션의 빌더 유형 설문은 준비 중입니다.
          </section>
        )}
      </div>

      <section className="mt-8 lg:mt-12" aria-labelledby="home-audience-title">
        <h2 id="home-audience-title" className="text-lg font-semibold">
          어떻게 시작할까요?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          같은 지식을, 사람의 학습과 에이전트의 작업에 맞게.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {AUDIENCES.map(({ id, title, label, summary, action, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpenLatest(id)}
              data-audience={id}
              data-tone={id === 'practice' ? 'projects' : 'updates'}
              className="editorial-audience-card group flex min-h-[230px] items-center gap-5 rounded-[18px] border p-6 text-left hover:border-white/60 sm:p-7"
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[10px] font-semibold tracking-[1.2px]"
                  style={{ color: 'var(--editorial-accent)' }}
                >
                  {label}
                </span>
                <span className="mt-3 block text-[22px] font-semibold leading-snug">{title}</span>
                <span className="mt-3 block text-xs leading-6 text-[var(--editorial-muted)]">
                  {summary}
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--editorial-accent)]">
                  {action} <ArrowRight size={14} />
                </span>
              </span>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 sm:h-24 sm:w-24">
                <Icon
                  className="h-8 w-8 sm:h-11 sm:w-11"
                  strokeWidth={1.3}
                  style={{ color: 'var(--editorial-accent)' }}
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* {hub && (
        <section className="mt-10 border-t border-[var(--editorial-line)] pt-5">
          <RelatedLinks
            title="시작하기 좋은 케이스"
            ids={hub.cases.map((study) => study.id)}
            data={hub}
            onOpen={onOpenLatest}
          />
        </section>
      )} */}

      <section className="mt-8 lg:mt-12" aria-labelledby="ecosystem-heatmap-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="ecosystem-heatmap-title" className="text-lg font-semibold">
              Ecosystem Heatmap
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--editorial-muted)]">
              타일 크기는 분야별 프로젝트 수를 나타냅니다. 분야를 선택해 프로젝트를 살펴보세요.
            </p>
          </div>
          <span className="rounded-full border border-[var(--editorial-line)] px-3 py-1.5 text-[10px] text-[var(--editorial-muted)]">
            {projects?.total ?? 0}개 프로젝트 · {projects?.categories.length ?? 0}개 분야
          </span>
        </div>
        {projectTiles.length ? (
          <EcosystemHeatmap
            items={projectTiles}
            onSelect={(category) =>
              onOpenProjectCategory ? onOpenProjectCategory(category) : onOpenScreen('projects')
            }
          />
        ) : (
          <p className="rounded-xl border border-[var(--editorial-line)] p-6 text-sm text-[var(--editorial-muted)]">
            {projects ? '등록된 프로젝트가 없습니다.' : '프로젝트 데이터를 불러오지 못했습니다.'}
          </p>
        )}
        <p className="mt-3 text-xs leading-6 text-[var(--editorial-muted)]">
          색상은 분야 구분용이며, 타일은 현재 등록된 프로젝트 기준입니다.
        </p>
      </section>

      {/* <section
        className="mt-12 border-t border-[var(--editorial-line)] pt-7"
        aria-labelledby="ecosystem-explore-title"
      >
        <h2 id="ecosystem-explore-title" className="text-lg font-semibold">
          생태계 둘러보기
        </h2>
        <p className="mt-2 text-sm text-[var(--editorial-muted)]">
          프로젝트에서 최신 소식까지, 분야별로 깊이 읽어보세요.
        </p>
        <div className="mt-5 grid gap-x-7 sm:grid-cols-2">
          {data.entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onOpenScreen(entry.id)}
              className="group flex min-h-[110px] items-center gap-4 border-b border-[var(--editorial-line)] py-5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="text-[10px] tracking-wide text-[var(--editorial-accent)]">
                  {entry.label}
                </span>
                <span className="mt-2 block text-base font-semibold group-hover:text-[var(--editorial-accent)]">
                  {entry.title}
                </span>
                <span className="mt-2 block text-xs leading-6 text-[var(--editorial-muted)]">
                  {entry.summary}
                </span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-[var(--editorial-muted)]" />
            </button>
          ))}
        </div>
      </section> */}
    </article>
  )
}
