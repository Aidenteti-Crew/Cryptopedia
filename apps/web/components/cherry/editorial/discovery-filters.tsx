'use client'

import { useState, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover'

export function DiscoveryFilterPanel({
  count,
  resultCount,
  children,
  label = '필터',
  onReset,
  onOpenChange,
  description = '여러 개를 선택할 수 있습니다. 선택하지 않은 항목은 전체로 조회합니다.',
}: {
  count: number
  resultCount: number
  children: ReactNode
  label?: string
  onReset: () => void
  onOpenChange?: (open: boolean) => void
  description?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        onOpenChange?.(value)
      }}
    >
      <PopoverTrigger
        aria-label={count ? `${label} · ${count}개 적용` : label}
        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm ${open || count ? 'bg-[var(--discovery-selection)] text-[var(--editorial-accent)]' : 'text-[var(--editorial-ink)] hover:bg-white/[.04]'}`}
      >
        <SlidersHorizontal size={16} />
        {label}
        {count > 0 && (
          <span className="bg-[var(--discovery-selection)] px-1.5 py-0.5 text-[10px] tabular-nums">
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        aria-label={`${label} 옵션`}
        align="end"
        sideOffset={10}
        className="editorial-root !min-h-0 flex max-h-[min(80dvh,var(--radix-popover-content-available-height))] w-[min(720px,calc(100vw-32px))] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border-[var(--discovery-line)] !bg-[var(--discovery-elevated)] p-0 text-[#e9edf2] shadow-[0_20px_70px_rgba(0,0,0,.45)] [color-scheme:dark]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-semibold">
            {label}
            {count > 0 && (
              <span className="ml-2 text-xs font-normal text-[var(--editorial-muted)]">
                {count}개 적용
              </span>
            )}
          </h2>
          <PopoverClose aria-label="필터 닫기" className="rounded-lg p-1.5 hover:bg-white/10">
            <X size={16} />
          </PopoverClose>
        </div>
        <div className="min-h-0 max-h-[min(55dvh,480px)] flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <p className="mb-4 text-xs leading-5 text-[var(--editorial-muted)]">{description}</p>
          {children}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={onReset}
            disabled={!count}
            className="min-h-10 text-xs text-[var(--editorial-muted)] hover:text-white disabled:opacity-40"
          >
            조건 초기화
          </button>
          <PopoverClose className="min-h-10 rounded-xl bg-[var(--editorial-accent)] px-4 text-xs font-medium text-[#15191e]">
            {resultCount}개 결과 보기
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function DiscoveryCheckboxGroup({
  label,
  value,
  options,
  onChange,
  columns = false,
}: {
  label: string
  value: string[]
  options: { value: string; label: string; count?: number }[]
  onChange: (value: string[]) => void
  columns?: boolean
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold text-[var(--editorial-ink)]">{label}</legend>
      <div className={columns ? 'grid gap-1 sm:grid-cols-2' : 'space-y-1'}>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm text-[var(--editorial-muted)] hover:bg-white/[.04] hover:text-[var(--editorial-ink)]"
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() =>
                onChange(
                  value.includes(option.value)
                    ? value.filter((v) => v !== option.value)
                    : [...value, option.value]
                )
              }
              className="h-4 w-4 shrink-0 accent-[var(--editorial-accent)] [color-scheme:dark]"
            />
            <span className="min-w-0 flex-1">{option.label}</span>
            {option.count !== undefined && (
              <span className="text-[11px] tabular-nums">{option.count}</span>
            )}
          </label>
        ))}
      </div>
      {options.length === 0 && (
        <p className="py-2 text-xs text-[var(--editorial-muted)]">일치하는 항목이 없습니다.</p>
      )}
    </fieldset>
  )
}

export function DiscoveryResults({
  count,
  description,
  active,
  onReset,
  children,
}: {
  count: number
  description?: string
  active?: boolean
  onReset: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-[var(--editorial-muted)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p role="status" aria-live="polite">
          검색 결과{' '}
          <strong className="font-medium tabular-nums text-[var(--editorial-ink)]">
            {count}개
          </strong>
        </p>
        {description && <span>{description}</span>}
        {active && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-9 text-[var(--editorial-accent)] hover:underline"
          >
            필터 초기화
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

export function DiscoveryTypeBar({
  label,
  value,
  onChange,
  options,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  children?: ReactNode
}) {
  return (
    <div className="mt-4 flex min-w-0 items-center gap-2 border-b border-white/15">
      <div
        role="group"
        aria-label={label}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {options.map(({ value: option, label: caption }) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`relative flex min-h-11 shrink-0 items-center gap-2 px-2 py-2 text-xs transition-colors sm:text-sm ${value === option ? 'font-semibold text-[var(--editorial-ink)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--editorial-accent)]' : 'text-[var(--editorial-muted)] hover:text-white'}`}
          >
            <span className="whitespace-nowrap">{caption}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
