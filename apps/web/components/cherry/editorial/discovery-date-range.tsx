'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { ko } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const parse = (value?: string) => (value ? new Date(`${value}T12:00:00`) : undefined)
const key = (value?: Date) =>
  value
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : ''

export function DiscoveryDateRange({
  from,
  to,
  onChange,
  label = '날짜 범위',
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const [selectingEnd, setSelectingEnd] = useState(false)
  const changeOpen = (value: boolean) => {
    if (value) {
      setDraftFrom(from)
      setDraftTo(to)
      setSelectingEnd(false)
    }
    setOpen(value)
  }
  const chooseDay = (date: Date) => {
    const day = key(date)
    if (!selectingEnd) {
      setDraftFrom(day)
      setDraftTo('')
      setSelectingEnd(true)
    } else {
      setDraftFrom(day < draftFrom ? day : draftFrom)
      setDraftTo(day < draftFrom ? draftFrom : day)
      setSelectingEnd(false)
    }
  }
  const incomplete = !!draftFrom && !draftTo
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/[.045] px-3 text-sm text-[#c4cbd4]"
        aria-label={label}
      >
        <CalendarDays size={15} />
        {from ? `${from} — ${to}` : label}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="editorial-root !min-h-0 dark w-auto max-w-[calc(100vw-24px)] rounded-2xl border-[var(--discovery-line)] !bg-[var(--discovery-elevated)] [--primary:var(--editorial-accent)] [--primary-foreground:#18181b] p-3 text-[#e5e9ee]"
      >
        <p aria-live="polite" className="px-3 pb-2 text-xs text-[#b9c2ce]">
          {incomplete
            ? '종료일을 선택하세요'
            : draftFrom
              ? `${draftFrom} — ${draftTo}`
              : '시작일과 종료일을 선택하세요'}{' '}
          · 한국시간
        </p>
        <Calendar
          mode="range"
          locale={ko}
          selected={draftFrom ? { from: parse(draftFrom), to: parse(draftTo) } : undefined}
          defaultMonth={parse(from)}
          onDayClick={chooseDay}
          className="rounded-xl bg-transparent"
        />
        <div className="flex items-center justify-between gap-4 border-t border-white/10 px-3 pt-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setDraftFrom('')
              setDraftTo('')
              setSelectingEnd(false)
            }}
          >
            전체 기간
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(false)}>
              취소
            </button>
            <button
              type="button"
              disabled={incomplete}
              onClick={() => {
                onChange(draftFrom, draftTo)
                setOpen(false)
              }}
              className="rounded-lg bg-[var(--editorial-accent)] px-4 py-2 text-[#15191e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              적용
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
