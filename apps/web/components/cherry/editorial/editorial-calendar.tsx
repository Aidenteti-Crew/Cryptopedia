import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CalendarItem = { id: string; title: string; day: string; endDay?: string }

export const EDITORIAL_CALENDAR_LAYOUT =
  'grid items-start gap-7 xl:grid-cols-2 xl:[--editorial-list-height:688px]'

export function EditorialCalendar({
  items,
  month,
  selectedDay,
  onMonthChange,
  onSelectDay,
  selectionStyle = 'filled',
  tone = 'events',
}: {
  items: CalendarItem[]
  month: string
  selectedDay: string | null
  onMonthChange: (month: string) => void
  onSelectDay: (day: string) => void
  selectionStyle?: 'filled' | 'outline'
  tone?: 'events' | 'macro'
}) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const offset = first.getUTCDay()
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const cells = Array.from({ length: 42 }, (_, index) => index - offset + 1)
  const move = (delta: number) => {
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
    onMonthChange(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: string) => today.find((part) => part.type === type)?.value ?? ''
  const todayKey = `${value('year')}-${value('month')}-${value('day')}`

  return (
    <section
      aria-label={`${year}년 ${monthNumber}월 달력`}
      data-calendar-tone={tone}
      className="editorial-color-calendar w-full overflow-hidden rounded-[22px] border"
    >
      <div className="editorial-calendar-heading flex h-[72px] items-center justify-between gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="이전 달"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/5"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold tabular-nums sm:text-lg">
            {year}년 {monthNumber}월
          </h2>
          <button
            type="button"
            onClick={() => onMonthChange(todayKey.slice(0, 7))}
            className="shrink-0 whitespace-nowrap rounded-md border border-[var(--editorial-line)] px-2 py-1 text-xs hover:border-[var(--editorial-accent)]"
          >
            오늘
          </button>
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="다음 달"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/5"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="editorial-calendar-weekdays grid grid-cols-7 text-center text-xs">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <span key={day} className="py-2 first:text-[#ffc0cb] last:text-[#b5d4ff]">
            {day}
          </span>
        ))}
      </div>
      <div className="editorial-calendar-days grid grid-cols-7 gap-px">
        {cells.map((day, index) => {
          if (day < 1 || day > lastDay)
            return (
              <span
                key={`blank-${index}`}
                className="editorial-calendar-blank h-[88px] sm:h-24"
                aria-hidden="true"
              />
            )
          const key = `${month}-${String(day).padStart(2, '0')}`
          const events = items.filter((item) => item.day <= key && (item.endDay ?? item.day) >= key)
          const titles = events.map((item) => item.title).join(', ')
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              aria-label={`${monthNumber}월 ${day}일, ${events.length}건${events.length ? `, ${titles}` : ''}`}
              aria-pressed={selectedDay === key}
              aria-current={key === todayKey ? 'date' : undefined}
              data-weekday={index % 7}
              data-selected={selectedDay === key}
              data-occupied={events.length > 0}
              data-selection-style={selectionStyle}
              title={events.length ? titles : undefined}
              className="editorial-calendar-cell flex h-[88px] min-w-0 flex-col items-start overflow-hidden px-1.5 py-1.5 text-left sm:h-24 sm:px-2 sm:py-2"
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span
                  data-today={key === todayKey}
                  className="editorial-calendar-date text-xs tabular-nums"
                >
                  {day}
                </span>
              </span>
              {events.length > 0 && (
                <>
                  <span className="mt-1 flex w-full items-center justify-between gap-0.5">
                    <span
                      data-calendar-marker
                      className="editorial-calendar-count shrink-0 rounded px-1 text-[10px] font-semibold leading-4"
                    >{`${events.length}건`}</span>
                    {events.length > 1 && (
                      <span className="shrink-0 text-[9px] text-[var(--editorial-muted)]">{`+${events.length - 1}개`}</span>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 w-full break-words text-[10px] leading-4 text-[var(--editorial-muted)] sm:text-[11px]">
                    {events[0].title}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
