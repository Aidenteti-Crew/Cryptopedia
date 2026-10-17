'use client'

import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

/* 페이지 제목 — 장식 아이콘 없이 제목·개수·설명만 (생태계 홈·챕터 페이지와 같은 조용한 톤) */
export function DiscoveryHeader({
  title,
  description,
  count,
}: {
  title: string
  description: string
  count: number
}) {
  return (
    <header className="pb-7">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-.7px] sm:text-[34px]">
          {title}
        </h1>
        <span className="font-mono text-xs tabular-nums text-[var(--editorial-muted)]">{count}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">{description}</p>
    </header>
  )
}

export function DiscoveryToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[var(--discovery-line)] bg-[var(--discovery-surface)] p-2.5">
      {children}
    </div>
  )
}

export function DiscoverySearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex min-h-11 min-w-0 basis-full items-center gap-3 px-2 sm:min-w-[180px] sm:flex-1 sm:basis-auto">
      <Search size={18} className="shrink-0 text-[var(--editorial-muted)]" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 w-full bg-transparent py-2 text-sm text-[var(--editorial-ink)] outline-none placeholder:text-[#858e9b] focus-visible:underline focus-visible:decoration-[var(--editorial-accent)] focus-visible:underline-offset-8"
      />
    </label>
  )
}

export function DiscoveryFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const current = options.find((option) => option.value === value)
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={`max-w-[220px] rounded-xl border-0 px-3 shadow-none data-[size=default]:h-10 ${value !== 'all' && value !== 'latest' && value !== 'name' ? 'bg-[var(--discovery-selection)] text-[var(--editorial-accent)]' : 'bg-[var(--discovery-elevated)] text-[var(--editorial-muted)]'} hover:bg-white/[.09]`}
      >
        <span className="truncate">{value === 'all' ? label : (current?.label ?? value)}</span>
      </SelectTrigger>
      <SelectContent className="editorial-root !min-h-0 rounded-xl border-[var(--discovery-line)] !bg-[var(--discovery-elevated)] p-1 text-[var(--editorial-ink)] shadow-[0_18px_50px_rgba(0,0,0,.45)]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="min-h-10 rounded-lg text-sm focus:bg-[var(--discovery-selection)] focus:text-[var(--editorial-accent)]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function DiscoveryChips({
  items,
  onReset,
}: {
  items: { label: string; remove: () => void }[]
  onReset: () => void
}) {
  if (!items.length) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.remove}
          className="inline-flex items-center gap-2 bg-[var(--discovery-selection)] px-3 py-1.5 text-xs text-[var(--editorial-accent)]"
        >
          {item.label}
          <X size={12} />
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="px-2 py-1.5 text-xs text-[var(--editorial-muted)] hover:text-white"
      >
        필터 초기화
      </button>
    </div>
  )
}
