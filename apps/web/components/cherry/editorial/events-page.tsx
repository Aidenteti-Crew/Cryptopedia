import type { EventEntry, EventStatus } from "@/lib/cryptopedia-types"

interface EventsPageProps {
  events: EventEntry[]
  archiveMode?: boolean
  onOpenArchive?: () => void
}

function formatEventDate(event: EventEntry): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: event.timezone,
    month: "long",
    day: "numeric",
    weekday: "short",
    ...(event.allDay ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(event.startsAt))
}

function EventRow({ event }: { event: EventEntry }) {
  const content = (
    <>
      <span className="w-40 shrink-0 text-xs tabular-nums text-[var(--editorial-accent)]">
        {formatEventDate(event)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base text-[var(--editorial-ink)]">
          {event.title}
        </span>
        <span className="mt-1.5 block text-xs leading-5 text-[var(--editorial-muted)]">
          {event.organizer ? `${event.organizer} 주최 · ` : ""}
          {event.venueName ?? "장소 정보 없음"}
        </span>
      </span>
      <span className="text-xs text-[var(--editorial-muted)]">
        {event.status}
      </span>
    </>
  )

  const className =
    "flex min-h-[95px] w-full items-start gap-5 border-b border-[var(--editorial-line)] py-5 text-left max-sm:flex-col max-sm:gap-2"

  return event.sourceUrl ? (
    <a
      href={event.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  )
}

function EventGroup({
  title,
  statuses,
  events,
}: {
  title: string
  statuses: EventStatus[]
  events: EventEntry[]
}) {
  const group = events.filter((event) => statuses.includes(event.status))
  if (group.length === 0) return null

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between border-b border-[var(--editorial-line)] pb-3">
        <h2 className="text-base">{title}</h2>
        <span className="text-xs tabular-nums text-[var(--editorial-muted)]">
          {group.length}개
        </span>
      </div>
      {group.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </section>
  )
}

export function EventsPage({
  events,
  archiveMode = false,
  onOpenArchive,
}: EventsPageProps) {
  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <p className="text-[11px] text-[var(--editorial-muted)]">
        {archiveMode ? "← 행사 및 이벤트" : "← 생태계 · 매크로"}
      </p>
      <p className="mt-5 text-[11px] text-[var(--editorial-accent)]">
        AVALANCHE / COMMUNITY EVENTS
      </p>
      <h1 className="mt-3 text-[34px] font-normal leading-[1.55]">
        {archiveMode ? "지난 이벤트" : "행사 및 이벤트"}
      </h1>
      <p className="editorial-copy mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
        {archiveMode
          ? "종료된 행사와 커뮤니티의 기록을 모았습니다."
          : "다가오는 만남부터 지난 행사까지, 생태계의 활동을 만나보세요."}
      </p>
      <div className="mt-5 flex items-center justify-between border-y border-[var(--editorial-line)] py-4 text-xs text-[var(--editorial-muted)]">
        <span>
          {archiveMode
            ? "2026년 9월 · 종료일 최신순"
            : "2026년 · 행사 일정 기준"}
        </span>
        {!archiveMode && onOpenArchive ? (
          <button
            type="button"
            onClick={onOpenArchive}
            className="min-h-10 px-2 text-[var(--editorial-ink)] hover:text-[var(--editorial-accent)]"
          >
            전체 보기 →
          </button>
        ) : null}
      </div>

      {archiveMode ? (
        <section>
          {events
            .filter((event) => event.status === "PAST")
            .map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
        </section>
      ) : (
        <>
          <EventGroup
            title="예정된 이벤트"
            statuses={["UPCOMING", "ONGOING"]}
            events={events}
          />
          <EventGroup title="지난 이벤트" statuses={["PAST"]} events={events} />
          <EventGroup
            title="일정 변경"
            statuses={["CANCELLED", "POSTPONED"]}
            events={events}
          />
        </>
      )}

      <footer className="mt-8 border-t border-[var(--editorial-line)] pt-3 text-[11px] text-[var(--editorial-muted)]">
        제공된 행사 자료 기준 · 원문 연결은 수집 데이터 등록 후 제공
      </footer>
    </article>
  )
}
