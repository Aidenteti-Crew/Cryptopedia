'use client'

import { useEffect, useState } from 'react'
import { ResponsiveContainer, Treemap } from 'recharts'
import type { ProjectHeatmapItem } from '@/lib/cryptopedia-home'

const COLORS = [
  ['#693AB4', '#9162D0'],
  ['#087E99', '#18A6B6'],
  ['#A9456B', '#D76683'],
  ['#A35C1D', '#D68B35'],
  ['#2869A6', '#4594CF'],
  ['#387D57', '#54A875'],
  ['#7653AA', '#A17CC8'],
  ['#A64D46', '#D27467'],
] as const

const SHORT_LABELS: Record<string, string> = {
  'Blockchain as a Service': 'Blockchain Services',
  'Stablecoins as a Service': 'Stablecoins',
  'Tokenization Platforms': 'Tokenization',
  'Validator Infrastructure': 'Validators',
  'Wallets and Account Abstraction': 'Wallets & Accounts',
}

interface HeatmapTile extends ProjectHeatmapItem {
  index: number
}

function HeatmapTileContent({
  x = 0,
  y = 0,
  width,
  height,
  name,
  count,
  percent,
  category,
  index,
  onSelect,
  compactLabels = false,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  count?: number
  percent?: number
  category?: string | null
  index?: number
  onSelect: (category: string | null) => void
  compactLabels?: boolean
}) {
  if (
    !width ||
    !height ||
    !name ||
    count === undefined ||
    percent === undefined ||
    category === undefined ||
    index === undefined
  )
    return null
  const [start, end] = category === null ? ['#41404E', '#646174'] : COLORS[index % COLORS.length]
  const showTitle = compactLabels || (width > 92 && height > 52)
  const showCount = compactLabels ? width > 80 && height > 95 : width > 64 && height > 42
  const showPercent = !compactLabels && width > 135 && height > 85
  const gradientId = `ecosystem-heatmap-${index}`
  const displayName = compactLabels ? name : width < 145 ? (SHORT_LABELS[name] ?? name) : name
  const padX = compactLabels ? 8 : 12
  const padY = compactLabels ? 7 : 10

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${count}개 프로젝트, 전체의 ${percent}%. 프로젝트 목록 보기`}
      onClick={() => onSelect(category)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(category)
        }
      }}
      className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-white"
    >
      <title>{`${name} · ${count}개 프로젝트 (${percent}%)`}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={start} />
          <stop offset="100%" stopColor={end} />
        </linearGradient>
      </defs>
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        rx={8}
        fill={`url(#${gradientId})`}
        stroke="transparent"
        strokeWidth={2}
        className="transition-[filter] duration-150 hover:brightness-125"
      />
      {(showTitle || showCount) && (
        <foreignObject
          x={x + padX}
          y={y + padY}
          width={Math.max(0, width - padX * 2)}
          height={Math.max(0, height - padY * 2)}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex h-full min-w-0 flex-col justify-between overflow-hidden text-white">
            {showTitle && (
              <span
                className={`break-words font-semibold leading-[1.15] ${compactLabels ? 'text-[10px]' : width < 145 ? 'text-[12px]' : 'text-[12px] sm:text-[15px]'}`}
                style={compactLabels && width < 75 ? { fontSize: 9 } : undefined}
              >
                {displayName}
              </span>
            )}
            {showCount && (
              <span className="flex flex-wrap items-end gap-x-2 leading-none">
                <span className="text-[20px] font-bold tabular-nums sm:text-[27px]">{count}</span>
                {showPercent && (
                  <span className="pb-0.5 text-[11px] font-medium text-white/80">{percent}%</span>
                )}
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export function EcosystemHeatmap({
  items,
  onSelect,
}: {
  items: ProjectHeatmapItem[]
  onSelect: (category: string | null) => void
}) {
  const [compactLabels, setCompactLabels] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => setCompactLabels(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const tiles: HeatmapTile[] = items.map((item, index) => ({ ...item, index }))

  return (
    <div className="rounded-[20px] lg:border border-[var(--editorial-line)] bg-[#18151F] lg:p-3">
      <div className="h-[760px] lg:h-[430px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={tiles}
            dataKey="count"
            aspectRatio={4 / 3}
            fill="transparent"
            stroke="transparent"
            content={<HeatmapTileContent onSelect={onSelect} compactLabels={compactLabels} />}
            isAnimationActive={false}
          />
        </ResponsiveContainer>
      </div>
    </div>
  )
}
