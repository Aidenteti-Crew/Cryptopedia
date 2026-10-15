import type { CollectionPageData } from '@/lib/cryptopedia-types'

import { BrandSpheres } from './brand-spheres'
import { ContentEntryList } from './content-entry-list'

interface CollectionPageProps {
  data: CollectionPageData
  onOpenEntry: (id: string) => void
}

export function CollectionPage({ data, onOpenEntry }: CollectionPageProps) {
  return (
    <article className="px-5 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]">
      {/* 구체 그래픽은 Avalanche 대표 페이지(VOLUME 01) 헤더 안에서만 — 목차 영역은 침범하지 않는다.
          헤더를 오른쪽·위쪽 여백까지 확장(-mr/-mt)해 화면 가장자리에서 잘리게 한다. */}
      <header className="relative -mr-5 -mt-4 overflow-hidden pb-7 pr-5 pt-4 sm:-mr-8 sm:pr-8 lg:-mr-[52px] lg:min-h-[236px] lg:pr-[52px]">
        {data.volume === 1 && <BrandSpheres className="w-full sm:w-[62%] lg:w-[56%]" />}
        <div className="relative">
          <h1 className="editorial-chapter-title text-[44px] leading-[1.15] text-[var(--editorial-ink)] lg:text-[56px]">
            {data.title}
          </h1>
          <p className="editorial-copy mt-5 text-xl leading-[1.5] text-[var(--editorial-ink)]">
            {data.tagline}
          </p>
          <div className="editorial-copy mt-3 text-sm leading-[1.5] text-[var(--editorial-muted)]">
            {data.introduction.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </header>

        <div className="border-t border-[var(--editorial-line)] pt-5">
          <h2 className="text-base leading-6 text-[var(--editorial-ink)]">
            {data.sectionTitle}
            <span className="px-2">/</span>
            <span className="tabular-nums">{String(data.entries.length).padStart(2, '0')}</span>
          </h2>
          <div className="mt-4">
            <ContentEntryList entries={data.entries} onOpen={onOpenEntry} />
        </div>
        </div>
      </article>
    )
  }
