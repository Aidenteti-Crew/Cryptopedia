import type { EventStatus } from './event-query';

// Recruiting status, computed at request time like the event status (rules:
// apps/docs/events-auth/2-detail-design.md §5-1). A missing deadline is never filled in from
// the start date: the page says "check the official page" instead of guessing.
export const REGISTRATION_STATUSES = [
  'OPEN',
  'CLOSING_SOON',
  'CLOSED',
  'UNKNOWN',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const CLOSING_SOON_DAYS = 3;

const DAY_MS = 86_400_000;

export interface RegistrationInput {
  eventStatus: EventStatus;
  deadline: Date | null;
  override: string | null;
}

export interface RegistrationResult {
  status: RegistrationStatus;
  // Whole days left, rounded up (12 hours left is D-1). Null once closed or without a deadline.
  daysUntilDeadline: number | null;
}

export function registrationStatus(
  input: RegistrationInput,
  now: Date,
): RegistrationResult {
  const closed: RegistrationResult = {
    status: 'CLOSED',
    daysUntilDeadline: null,
  };
  if (input.eventStatus === 'CANCELLED' || input.eventStatus === 'PAST')
    return closed;
  if (input.override === 'CLOSED_EARLY') return closed;
  // A postponed event's old deadline no longer says anything about the new date.
  if (input.eventStatus === 'POSTPONED' || !input.deadline)
    return { status: 'UNKNOWN', daysUntilDeadline: null };

  const left = input.deadline.getTime() - now.getTime();
  if (left <= 0) return closed;
  const days = Math.ceil(left / DAY_MS);
  return {
    status: days <= CLOSING_SOON_DAYS ? 'CLOSING_SOON' : 'OPEN',
    daysUntilDeadline: days,
  };
}
