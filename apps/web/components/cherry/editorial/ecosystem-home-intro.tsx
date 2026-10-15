'use client'

import Image from 'next/image'

import { getChainHomeContent } from '@/lib/avalanche-home'
import type { EcosystemPageData } from '@/lib/cryptopedia-types'

export function EcosystemHomeIntro({
  data,
  chainId = 'avalanche',
  chainLogoUrl,
}: {
  data: EcosystemPageData
  chainId?: string
  chainLogoUrl?: string
}) {
  const content = getChainHomeContent(chainId)
  const hero = content?.hero ?? {
    subcopy: data.tagline,
    description: data.introduction.join(' '),
    keywords: [],
  }

  return (
    <>
      <header className="relative -mr-5 -mt-4 overflow-hidden pb-12 pr-5 pt-4 sm:-mr-8 sm:pr-8 lg:-mr-[52px] lg:min-h-[360px] lg:pr-[52px]">
        <div className="relative">
          <h1 className="editorial-chapter-title flex items-center gap-3 text-[48px] leading-[1.1] text-[var(--editorial-ink)] sm:gap-4 lg:text-[64px]">
            {/* {chainLogoUrl && (
              <Image
                src={chainLogoUrl}
                alt=""
                width={64}
                height={64}
                className="h-11 w-11 shrink-0 rounded-full object-contain sm:h-[58px] sm:w-[58px]"
              />
            )} */}
            {data.title}
          </h1>
          <p className="editorial-copy mt-6 max-w-[26ch] text-[22px] leading-[1.45] text-[var(--editorial-strong)] sm:max-w-none">
            {hero.subcopy}
          </p>
          <p className="editorial-copy mt-5 max-w-[56ch] text-[15px] leading-[1.8] text-[var(--editorial-muted)]">
            {hero.description}
          </p>
          {hero.keywords.length > 0 && (
            <ul className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--editorial-ink)]">
              {hero.keywords.map((keyword, index) => (
                <li key={keyword} className="flex items-center gap-3">
                  {index > 0 && (
                    <span aria-hidden="true" className="text-[var(--editorial-muted)]">
                      /
                    </span>
                  )}
                  {keyword}
                </li>
              ))}
            </ul>
          )}
          {data.taglineSourceUrl && (
            <a
              href={data.taglineSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
            >
              공식 홈페이지 ↗
            </a>
          )}
        </div>
      </header>
    </>
  )
}
