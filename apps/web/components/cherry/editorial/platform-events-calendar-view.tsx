import type { EventEntry } from '@/lib/cryptopedia-types'
import { calendarDay } from '@/lib/editorial-discovery'
import { calendarEntries, dayHeading, eventsOnDay } from '@/lib/platform-events'

import { EditorialCalendar } from './editorial-calendar'
import { PlatformEventCard } from './platform-event-list'

export function PlatformEventsCalendarView({
  events,
  day,
  now,
  onSelectDay,
}: {
  events: EventEntry[]
  day: string
  now: Date
  onSelectDay: (day: string) => void
}) {
  const today = calendarDay(now.toISOString())
  const dayEvents = eventsOnDay(events, day)
  const heading = dayHeading(day, now)
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 lg:sticky lg:top-28">
        <EditorialCalendar
          items={calendarEntries(events)}
          month={day.slice(0, 7)}
          selectedDay={day}
          onMonthChange={(month) => onSelectDay(month === today.slice(0, 7) ? today : `${month}-01`)}
          onSelectDay={onSelectDay}
        />
      </div>
      <section aria-label={`${heading.date} ${heading.weekday} 행사`} className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--editorial-strong)]">
          {heading.date} <span className="font-normal text-[var(--editorial-muted)]">{heading.weekday}</span>
        </h2>
        {dayEvents.length ? (
          <div className="mt-3 space-y-3">
            {dayEvents.map((event) => (
              <PlatformEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-3 border border-[var(--editorial-line)] p-5 text-sm text-[var(--editorial-muted)]">
            이 날은 예정된 행사가 없어요.
          </p>
        )}
      </section>
    </div>
  )
}
