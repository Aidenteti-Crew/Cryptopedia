'use client'

import Image from 'next/image'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { ChainCollectionItem } from '@/lib/cryptopedia-types'
import chains from '@/public/cryptopedia/chains.json'

export type SelectedChain = Pick<ChainCollectionItem, 'id' | 'name' | 'logoUrl' | 'tagline' | 'taglineSourceUrl'>

/* 서비스 이름·부제는 여기 한 곳에서만 바꾼다. */
export const EDITORIAL_BRAND = {
  name: 'Proof of Cherry',
  byline: 'by Aidenteti Crew',
} as const

/* ─────────────────────────────────────────────
   로고 블록 — 기존 Cherry 사이드바 로고(.logo)와 같은 구조:
   34px 아이콘 + 이름 + 한 줄 부제
───────────────────────────────────────────── */
export function EditorialBrand({
  onHome,
  className = '',
}: {
  onHome: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onHome}
      aria-label={`${EDITORIAL_BRAND.name} 홈`}
      className={`flex min-w-0 items-center gap-2.5 text-left ${className}`}
    >
      <Image
        src="/cryptopedia/assets/aidenteti-seal.svg"
        alt="Aidenteti Crew seal"
        width={64}
        height={64}
        priority
        className="h-[34px] w-[34px] shrink-0 bg-white rounded-full"
      />
      <span className="min-w-0 leading-tight">
        <span className="editorial-display block truncate text-[21px] leading-[1.1] text-[var(--editorial-ink)]">
          {EDITORIAL_BRAND.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--editorial-muted)]">
          {EDITORIAL_BRAND.byline}
        </span>
      </span>
    </button>
  )
}

/* ─────────────────────────────────────────────
   컬렉션 선택 — 별도 페이지 이동 없이 드롭다운으로 선택
───────────────────────────────────────────── */
export function EditorialCollectionButton({
  activeChainName,
  activeChainLogoUrl,
  onSelectChain,
}: {
  activeChainName: string
  /** 체인 공식 로고 아바타 — 없으면 이름만 표시 */
  activeChainLogoUrl?: string
  onSelectChain?: (chain: SelectedChain) => void
}) {
  return (
    <Select
      value={chains.items.find((chain) => chain.name === activeChainName)?.id}
      onValueChange={(id) => {
        const chain = chains.items.find((item) => item.id === id)
        if (chain?.status === 'AVAILABLE') onSelectChain?.(chain)
      }}
    >
      <SelectTrigger
        aria-label={`컬렉션 선택 — 현재 ${activeChainName}`}
        className="h-auto min-h-9 w-[150px] min-w-0 cursor-pointer gap-2 rounded-lg border-[var(--editorial-line)] bg-[var(--editorial-surface)] px-3 py-2 text-[12px] font-medium text-[var(--editorial-ink)] shadow-none hover:border-[var(--editorial-accent)] focus-visible:border-[var(--editorial-accent)] focus-visible:ring-[var(--editorial-accent)]/25 dark:bg-[var(--editorial-surface)] dark:hover:bg-[var(--editorial-surface)] sm:w-[220px] lg:w-full"
      >
        <span className="hidden text-[10px] tracking-[0.9px] text-[var(--editorial-muted)] sm:inline">
          COLLECTION
        </span>
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
          {activeChainLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- 18px SVG 아바타라 최적화 불필요
            <img
              src={activeChainLogoUrl}
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] shrink-0 rounded-full ring-1 ring-white/15"
            />
          )}
          <SelectValue>
            <span className="truncate">{activeChainName}</span>
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={4}
        style={{ minHeight: 0, backgroundColor: 'var(--editorial-surface)' }}
        className="editorial-root rounded-lg border-[var(--editorial-line)] bg-[var(--editorial-surface)] text-[var(--editorial-ink)] shadow-xl"
      >
        {chains.items.map((chain) => (
          <SelectItem
            key={chain.id}
            value={chain.id}
            disabled={chain.status !== 'AVAILABLE'}
            className="cursor-pointer rounded-md py-2 text-[12px] focus:bg-[#202832] focus:text-[var(--editorial-accent)] data-[state=checked]:text-[var(--editorial-accent)] data-[disabled]:cursor-not-allowed data-[disabled]:text-[var(--editorial-muted)] data-[disabled]:opacity-50"
          >
            {chain.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 로컬 체인 SVG 로고
              <img
                src={chain.logoUrl}
                alt=""
                width={18}
                height={18}
                className="h-[18px] w-[18px] shrink-0 rounded-full"
              />
            )}
            {chain.name}
            {chain.status !== 'AVAILABLE' ? ' (Coming soon)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
