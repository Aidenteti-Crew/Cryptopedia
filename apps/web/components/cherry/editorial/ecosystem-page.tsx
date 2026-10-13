'use client'

import { ArrowRight, BookOpen, Bot, CalendarDays, Code2, Globe2, Layers3 } from 'lucide-react'
import type { EcosystemPageData } from '@/lib/cryptopedia-types'
import type { HubData } from '@/lib/cryptopedia-hub'
import { HeroCarousel, HERO_GRADIENTS, type OverviewHeroItem } from '../nd-overview-page'
import { RelatedLinks } from './hub-shared'
import { CategoryTreemap } from '../buzz-treemap'
import { getNewsDistribution, NEWS_LABELS, sortHomeNews } from '@/lib/cryptopedia-home'

interface EcosystemPageProps {
  data: EcosystemPageData
  hub?: HubData
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
const AUDIENCES = [
  {
    id: 'practice',
    title: '사람이 공부하기',
    label: 'FOR PEOPLE',
    summary: '목표에 맞는 개념을 배우고, 공식 자료와 예제를 따라 케이스별로 실습하세요.',
    action: '케이스별 실습으로',
    Icon: BookOpen,
    color: '#baa4df',
    background: 'linear-gradient(135deg,rgba(123,94,167,0.18),rgba(123,94,167,0.04))',
  },
  {
    id: 'skill-library',
    title: '에이전트에게 전달하기',
    label: 'FOR AGENTS',
    summary: '필요한 지식과 스킬을 찾아 지침·출처·완료 조건이 담긴 파일로 전달하세요.',
    action: '스킬 라이브러리로',
    Icon: Bot,
    color: '#8bcab4',
    background: 'linear-gradient(135deg,rgba(45,122,94,0.18),rgba(45,122,94,0.04))',
  },
]

export function EcosystemPage({ data, hub, onOpenScreen, onOpenLatest }: EcosystemPageProps) {
  const latest = sortHomeNews(data.latest)
  const distribution = getNewsDistribution(latest)
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
    <article className="min-w-0 px-4 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]">
      <section aria-label="생태계 최신 소식">
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
                <button
                  type="button"
                  onClick={() => onOpenLatest(slide.i)}
                  className="relative grid min-h-[320px] w-full min-w-0 overflow-hidden rounded-[20px] text-left text-white shadow-[0_10px_34px_rgba(0,0,0,0.2)] md:grid-cols-[minmax(280px,42%)_1fr]"
                >
                  <span
                    className="flex min-w-0 flex-col px-7 py-8 sm:px-10"
                    style={{ background: HERO_GRADIENTS[index % HERO_GRADIENTS.length][0] }}
                  >
                    <span className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[1.2px] text-white/75">
                      <span>{category.label}</span>
                      <span className="rounded-full border border-white/25 px-2 py-0.5 tracking-normal">
                        예시 소식
                      </span>
                    </span>
                    <span className="mt-4 block text-[28px] font-semibold leading-[1.3] tracking-[-0.5px] sm:text-[34px]">
                      {slide.n}
                    </span>
                    <span className="mt-4 block max-w-[38ch] text-sm leading-7 text-white/80">
                      {slide.d}
                    </span>
                    <span className="mt-auto flex flex-wrap items-center gap-3 pt-7 text-xs text-white/80">
                      <span>
                        {entry.publishedAt
                          ? '게시 ' + entry.publishedAt.slice(0, 10)
                          : '정적 콘텐츠 미리보기'}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-2 font-semibold">
                        소식 살펴보기 <ArrowRight size={15} />
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative flex min-h-[170px] items-center justify-center overflow-hidden md:min-h-[320px]"
                    style={{ background: HERO_GRADIENTS[index % HERO_GRADIENTS.length][1] }}
                  >
                    <span className="absolute -right-12 -top-24 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.28),transparent_62%)]" />
                    <span className="absolute h-[100px] w-[100px] -translate-x-28 -translate-y-6 -rotate-12 rounded-[24px] bg-white/10 sm:h-[120px] sm:w-[120px]" />
                    <span className="absolute h-[100px] w-[100px] translate-x-28 translate-y-8 rotate-12 rounded-[24px] bg-white/10 sm:h-[120px] sm:w-[120px]" />
                    <span className="relative z-[1] flex h-[112px] w-[112px] -rotate-3 items-center justify-center rounded-[28px] bg-white/95 shadow-[0_22px_50px_rgba(30,10,55,0.3)] md:h-[150px] md:w-[150px]">
                      <Icon size={66} strokeWidth={1.2} className="text-[#4b3567]" />
                    </span>
                  </span>
                </button>
              )
            }}
          />
        ) : (
          <p className="rounded-xl border border-[var(--editorial-line)] p-6 text-sm text-[var(--editorial-muted)]">
            새 소식이 등록되면 이곳에 표시됩니다.
          </p>
        )}
      </section>

      <header className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.3px] text-[var(--editorial-accent)]">
            {data.eyebrow}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.5px] sm:text-[34px]">
            {data.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">{data.tagline}</p>
          {data.taglineSourceUrl && (
            <a
              href={data.taglineSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[10px] text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
            >
              공식 홈페이지 ↗
            </a>
          )}
        </div>
        <span className="w-fit rounded-full border border-[var(--editorial-line)] px-3 py-1.5 text-[10px] tracking-wide text-[var(--editorial-muted)]">
          CONNECTED KNOWLEDGE
        </span>
      </header>

      <section className="mt-7" aria-labelledby="home-audience-title">
        <h2 id="home-audience-title" className="text-lg font-semibold">
          어떻게 시작할까요?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          같은 지식을, 사람의 학습과 에이전트의 작업에 맞게.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {AUDIENCES.map(({ id, title, label, summary, action, Icon, color, background }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpenLatest(id)}
              className="group flex min-h-[230px] items-center gap-5 rounded-[18px] border border-[var(--editorial-line)] p-6 text-left transition-transform hover:-translate-y-0.5 hover:border-[var(--editorial-accent)] sm:p-7"
              style={{ background }}
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[10px] font-semibold tracking-[1.2px]"
                  style={{ color }}
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
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] sm:h-24 sm:w-24">
                <Icon className="h-8 w-8 sm:h-11 sm:w-11" strokeWidth={1.3} style={{ color }} />
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

      <section className="mt-12" aria-labelledby="home-buzz-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="home-buzz-title" className="text-lg font-semibold">
              Buzz Distribution
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--editorial-muted)]">
              예시 소식 분포 · 현재 홈에 등록된 소식의 분야별 비중
            </p>
          </div>
          <span className="rounded-full border border-[var(--editorial-line)] px-3 py-1.5 text-[10px] text-[var(--editorial-muted)]">
            {distribution.reduce((sum, item) => sum + item.articleCount, 0)}개 소식
          </span>
        </div>
        {distribution.length ? (
          <CategoryTreemap
            items={distribution}
            labels={NEWS_LABELS}
            showHeader={false}
            useStaticFallback={false}
            appearance="editorial"
            onSelect={(page) => onOpenScreen(page as 'projects' | 'macro' | 'events' | 'updates')}
          />
        ) : (
          <p className="rounded-xl border border-[var(--editorial-line)] p-6 text-sm text-[var(--editorial-muted)]">
            집계할 소식이 없습니다.
          </p>
        )}
        {/* <div className="mt-3 flex flex-wrap gap-3">
          {distribution.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => onOpenScreen(item.page as 'projects' | 'macro' | 'events' | 'updates')}
              className="rounded-lg border border-[var(--editorial-line)] px-3 py-2 text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
            >
              {NEWS_LABELS[item.page]} · {item.articleCount}건 · {item.percent}%
            </button>
          ))}
        </div> */}
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
