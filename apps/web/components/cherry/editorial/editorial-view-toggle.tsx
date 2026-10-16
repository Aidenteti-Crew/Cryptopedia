'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, List } from 'lucide-react'

export type EditorialViewMode = 'list' | 'calendar'

export function CalendarVisibilityToggle({visible,onToggle}:{visible:boolean;onToggle:()=>void}) {
  const label=visible?'달력 숨기기':'달력 표시'
  return <button type="button" aria-label={label} title={label} aria-pressed={visible} onClick={onToggle}
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${visible?'bg-[var(--editorial-accent)] text-[#15191e]':'bg-white/[.045] text-[var(--editorial-muted)] hover:bg-white/10'}`}><CalendarDays size={18}/></button>
}

export function useEditorialViewMode(key: string, initial: EditorialViewMode) {
  const [view, setView] = useState<EditorialViewMode>(initial)
  useEffect(() => {
    const saved = window.localStorage.getItem(`editorial-view:${key}`)
    if (saved === 'list' || saved === 'calendar') setView(saved)
  }, [key])
  const select = (next: EditorialViewMode) => {
    setView(next)
    window.localStorage.setItem(`editorial-view:${key}`, next)
  }
  return [view, select] as const
}

export function EditorialViewToggle({ value, onChange }: { value: EditorialViewMode; onChange: (value: EditorialViewMode) => void }) {
  return (
    <div role="group" aria-label="보기 방식" className="inline-flex shrink-0 gap-1 rounded-xl bg-black/15 p-1">
      {([{ id: 'list', label: '리스트', Icon: List }, { id: 'calendar', label: '달력', Icon: CalendarDays }] as const).map(({ id, label, Icon }) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-label={label} title={label} aria-pressed={value === id}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${value === id ? 'bg-[var(--editorial-accent)] text-[#15191e] shadow-sm' : 'text-[var(--editorial-muted)] hover:bg-white/5 hover:text-[var(--editorial-ink)]'}`}>
          <Icon size={17} />
        </button>
      ))}
    </div>
  )
}
