'use client'

/* 생태계 홈 — `/`에서 사용하는 구성. */

import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

import { getChainHomeContent } from '@/lib/avalanche-home'
import type { EcosystemPageData } from '@/lib/cryptopedia-types'
import type { HubData } from '@/lib/cryptopedia-hub'
import { EcosystemPulse } from './ecosystem-pulse'

interface EcosystemHomeV2Props {
  data: EcosystemPageData
  hub?: HubData
  /** 체인별 홈 콘텐츠(lib/avalanche-home.ts)를 고르는 키 */
  chainId?: string
  /** 소식 피드 상태 — 'unavailable' 이면 소식 영역에 연결 불가를 표시한다 */
  feed?: 'live' | 'unavailable'
  onOpenScreen: (id: 'projects' | 'macro' | 'events' | 'updates') => void
  /** 문서·화면 id 를 연다 (사이드바 화면 id 도 허용) */
  onOpenLatest: (id: string) => void
}

function SectionHeading({ id, title, children, level = 2 }: { id: string; title: string; children?: ReactNode; level?: 1 | 2 }) {
  return (
    <div className="mb-7 max-w-[60ch]">
      {level === 1 ? (
        <h1 id={id} className="text-[24px] font-medium leading-snug tracking-[-0.3px] text-[var(--editorial-strong)] sm:text-[28px]">{title}</h1>
      ) : (
        <h2 id={id} className="text-[24px] font-medium leading-snug tracking-[-0.3px] text-[var(--editorial-strong)] sm:text-[28px]">{title}</h2>
      )}
      {children && <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-muted)]">{children}</p>}
    </div>
  )
}

const SECTION = 'mt-16 md:mt-20'

export function EcosystemHomeV2({
  data,
  chainId = 'avalanche',
  feed = 'live',
  onOpenScreen,
  onOpenLatest,
}: EcosystemHomeV2Props) {
  const content = getChainHomeContent(chainId)

  return (
    <article className="min-w-0 px-5 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[64px]">
      {/* SECTION 01 — What Can You Build? */}
      {content && (
        <section className={SECTION} aria-labelledby="home-build-title">
          <SectionHeading id="home-build-title" title="Avalanche에서 만들 수 있는 것" level={1} />
          <ul className="grid gap-x-12 gap-y-12 md:grid-cols-3">
            {content.build.map((path) => (
              <li key={path.id} className="border-t border-[var(--editorial-line)] pt-6">
                <p className="text-xs tabular-nums text-[var(--editorial-muted)]">{path.index}</p>
                <h3 className="mt-3 text-[22px] font-medium leading-snug text-[var(--editorial-strong)]">{path.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.75] text-[var(--editorial-muted)]">{path.learn}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {path.links.map((link) => (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => onOpenLatest(link.target.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 text-[14px] font-medium text-[var(--editorial-accent)] hover:text-[var(--editorial-strong)]"
                    >
                      {link.label} <ArrowRight size={14} strokeWidth={1.8} />
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* SECTION 02 — Ecosystem Pulse (실제 수집 데이터만) */}
      <section className={SECTION} aria-labelledby="home-pulse-title">
        <SectionHeading id="home-pulse-title" title="지금 생태계에서는" level={content ? 2 : 1}>
          수집된 최신 소식을 분야별로 요약합니다.
        </SectionHeading>
        <EcosystemPulse
          entries={data.latest}
          feed={feed}
          onOpenScreen={onOpenScreen}
          onOpenEntry={onOpenLatest}
        />
      </section>

      {/* SECTION 03 — Start Learning (얇은 구분선과 타이포그래피 중심의 목록) */}
      {content && (
        <section className={SECTION} aria-labelledby="home-learning-title">
          <SectionHeading id="home-learning-title" title="학습 시작하기" />
          <ul className="border-t border-[var(--editorial-line)]">
            {content.learning.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenLatest(item.id)}
                  className="group grid w-full grid-cols-[44px_1fr_auto] items-baseline gap-4 border-b border-[var(--editorial-line)] py-6 text-left sm:grid-cols-[64px_minmax(0,260px)_1fr_auto] sm:gap-6"
                >
                  <span className="text-xs tabular-nums text-[var(--editorial-muted)]">{item.number}</span>
                  <span className="text-[20px] font-medium text-[var(--editorial-strong)] group-hover:text-[var(--editorial-accent)]">
                    {item.title}
                  </span>
                  <span className="col-start-2 text-[14px] leading-6 text-[var(--editorial-muted)] sm:col-start-auto">
                    {item.description}
                  </span>
                  <ArrowRight
                    size={18}
                    strokeWidth={1.6}
                    className="col-start-3 row-start-1 text-[var(--editorial-muted)] group-hover:text-[var(--editorial-accent)] sm:col-start-auto sm:row-start-auto"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
