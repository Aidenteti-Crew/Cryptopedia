import type { EventEntry } from '@/lib/cryptopedia-types'

type ShownStatus = Exclude<EventEntry['registrationStatus'], 'UNKNOWN'>

const REGISTRATION: Record<ShownStatus, { label: string; color: string }> = {
  OPEN: { label: '모집중', color: 'blue' },
  // Not orange: the "예정" status badge beside it is orange, and the two would read as one.
  CLOSING_SOON: { label: '마감 임박', color: 'rose' },
  CLOSED: { label: '모집 마감', color: 'neutral' },
}

type Props = Pick<EventEntry, 'registrationStatus' | 'daysUntilDeadline' | 'status'>

// UNKNOWN shows nothing: a deadline is never guessed. A finished or cancelled event already
// says so in its own status badge, so "모집 마감" would only repeat it.
export function RegistrationBadge({ registrationStatus, daysUntilDeadline, status }: Props) {
  if (registrationStatus === 'UNKNOWN') return null
  if (registrationStatus === 'CLOSED' && (status === 'PAST' || status === 'CANCELLED')) return null
  const { label, color } = REGISTRATION[registrationStatus]
  const days = registrationStatus === 'CLOSING_SOON' && daysUntilDeadline ? ` D-${daysUntilDeadline}` : ''
  return (
    <span data-color={color} className="editorial-color-badge">
      {label}
      {days}
    </span>
  )
}
