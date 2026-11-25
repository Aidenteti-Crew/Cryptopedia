'use client'

import { Heart } from 'lucide-react'

import type { ChainOption } from '@/lib/platform-events'

import { EditorialViewToggle, type EditorialViewMode } from './editorial-view-toggle'

const chip =
  'inline-flex h-9 items-center gap-1.5 border px-3 text-sm transition-colors'
const chipOn = 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)] text-[var(--editorial-on-accent)]'
const chipOff =
  'border-[var(--editorial-line)] text-[var(--editorial-muted)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-strong)]'

export function PlatformEventsToolbar({
  view,
  onViewChange,
  chains,
  selectedChains,
  onToggleChain,
  onClearChains,
  savedOnly,
  savedCount,
  onToggleSavedOnly,
}: {
  view: EditorialViewMode
  onViewChange: (view: EditorialViewMode) => void
  chains: ChainOption[]
  selectedChains: string[]
  onToggleChain: (key: string) => void
  onClearChains: () => void
  savedOnly: boolean
  savedCount: number
  onToggleSavedOnly: () => void
}) {
  const none = selectedChains.length === 0

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <EditorialViewToggle value={view} onChange={onViewChange} />
      <div role="group" aria-label="체인별 보기" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={none}
          onClick={onClearChains}
          className={`${chip} ${none ? chipOn : chipOff}`}
        >
          전체
        </button>
        {chains.map((chain) => {
          const on = selectedChains.includes(chain.key)
          return (
            <button
              key={chain.key}
              type="button"
              aria-pressed={on}
              aria-label={`${chain.label} ${chain.count}건`}
              onClick={() => onToggleChain(chain.key)}
              className={`${chip} ${on ? chipOn : chipOff}`}
            >
              {chain.label}
              <span className="tabular-nums opacity-70">{chain.count}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        aria-pressed={savedOnly}
        onClick={onToggleSavedOnly}
        className={`${chip} sm:ml-auto ${savedOnly ? chipOn : chipOff}`}
      >
        <Heart size={15} aria-hidden fill={savedOnly ? 'currentColor' : 'none'} />
        관심 행사만 ({savedCount})
      </button>
    </div>
  )
}
