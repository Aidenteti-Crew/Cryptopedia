'use client'

import { ArrowRight, CalendarDays, Code2, Globe2, Layers3 } from 'lucide-react'
import type { EcosystemPageData, EcosystemProjectsResponse } from '@/lib/cryptopedia-types'
import type { HubData } from '@/lib/cryptopedia-hub'
import { HeroCarousel, type OverviewHeroItem } from '../nd-overview-page'
import { sortHomeNews } from '@/lib/cryptopedia-home'
import { MyPathCard } from './my-path-card'
import { EcosystemHomeIntro } from './ecosystem-home-intro'

interface EcosystemPageProps {
  data: EcosystemPageData
  hub?: HubData
  chainId?: string
  chainLogoUrl?: string
  projects?: EcosystemProjectsResponse | null
  onOpenScreen: (id: 'projects' | 'macro' | 'events' | 'updates') => void
  onOpenLatest: (id: string) => void
}

const NEWS_CATEGORIES = {
  PROJECT: { label: '체인·프로젝트', Icon: Layers3 },
  MACRO: { label: '매크로 소식', Icon: Globe2 },
  EVENT: { label: '행사·이벤트', Icon: CalendarDays },
  DEV: { label: '개발 업데이트', Icon: Code2 },
  UPDATE: { label: '개발 업데이트', Icon: Code2 },
}
export function EcosystemPage({
  data,
  hub,
  chainId = 'avalanche',
  chainLogoUrl,
  onOpenScreen,
  onOpenLatest,
}: EcosystemPageProps) {
  const latest = sortHomeNews(data.latest)
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

      {/* 캐러셀 옆 칸은 '내 경로' — 예전 빌더 유형 설문 자리 (/builder-test 페이지는 유지) */}
      <div
        className={`mt-8 grid min-w-0 items-start gap-8 lg:gap-6 ${hub ? 'lg:grid-cols-2' : ''}`}
      >
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
                    className="editorial-news-card relative flex h-[520px] w-full min-w-0 flex-col overflow-hidden text-left text-white lg:h-[600px]"
                  >
                    <span className="flex min-h-0 min-w-0 flex-1 flex-col px-7 py-8 sm:px-10">
                      <span className="flex shrink-0 flex-wrap items-center gap-3 pr-12 text-[10px] font-semibold uppercase tracking-[1.2px] text-white/75">
                        {/* 체인 포인트 색은 이 점 하나에만 — 보라 일색을 깨는 작은 악센트 */}
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-[var(--chain-accent)]"
                          />
                          {category.label}
                        </span>
                        <span className="border border-white/25 px-2 py-0.5 tracking-normal">
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
                      className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center border border-white/25 bg-white/15 sm:right-8 sm:top-8"
                    >
                      <Icon size={21} strokeWidth={1.6} />
                    </span>
                  </a>
                )
              }}
            />
          ) : (
            <p className="border border-[var(--editorial-line)] p-6 text-sm text-[var(--editorial-muted)]">
              새 소식이 등록되면 이곳에 표시됩니다.
            </p>
          )}
        </section>
        {hub && (
          <MyPathCard
            hub={hub}
            onOpen={onOpenLatest}
            onOpenStep={(step) =>
              step.kind === 'screen'
                ? onOpenScreen(step.id as 'projects' | 'events' | 'updates')
                : onOpenLatest(step.id)
            }
          />
        )}
      </div>

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
