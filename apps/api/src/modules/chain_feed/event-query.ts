// Validation for GET /api/events (contract: apps/docs/avalanche-editorial-ui/event-crawler-data-request.md).
// Kept free of Nest imports so it can be unit-tested without bootstrapping anything.

export const EVENT_STATUSES = [
  'UPCOMING',
  'ONGOING',
  'PAST',
  'CANCELLED',
  'POSTPONED',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const DEFAULT_EVENT_LIMIT = 20;
export const MAX_EVENT_LIMIT = 100;

export class InvalidEventQueryError extends Error {}

export interface EventCursor {
  startsAt: string;
  id: string;
}

export interface EventQuery {
  chain: string;
  status: EventStatus | null;
  // Inclusive lower bound and exclusive upper bound on starts_at, both UTC midnights.
  from: Date | null;
  toExclusive: Date | null;
  limit: number;
  cursor: EventCursor | null;
}

const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function single(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value))
    throw new InvalidEventQueryError(`${name} must be given once`);
  if (typeof value !== 'string')
    throw new InvalidEventQueryError(`${name} must be a string`);
  return value;
}

function parseDate(value: string | undefined, name: string): Date | null {
  if (value === undefined) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidEventQueryError(`${name} must be YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  // Date silently rolls 2026-02-31 over to March, so compare the round trip.
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new InvalidEventQueryError(`${name} is not a real date`);
  }
  return date;
}

export function encodeCursor(cursor: EventCursor): string {
  return Buffer.from(
    JSON.stringify({ s: cursor.startsAt, i: cursor.id }),
  ).toString('base64url');
}

export function decodeCursor(value: string): EventCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as {
      s?: unknown;
      i?: unknown;
    };
    if (
      typeof parsed.s === 'string' &&
      !Number.isNaN(Date.parse(parsed.s)) &&
      typeof parsed.i === 'string' &&
      UUID.test(parsed.i)
    ) {
      return { startsAt: parsed.s, id: parsed.i };
    }
  } catch {
    // fall through to the error below
  }
  throw new InvalidEventQueryError('cursor is not valid');
}

// Every feed is per chain; avalanche is the default because it is the only chain collected so far.
export function parseChain(raw: Record<string, unknown>): string {
  const chain = (single(raw.chain, 'chain') ?? 'avalanche').toLowerCase();
  if (!/^[a-z0-9_-]{1,50}$/.test(chain))
    throw new InvalidEventQueryError('chain is not valid');
  return chain;
}

export function parseEventQuery(raw: Record<string, unknown>): EventQuery {
  const chain = parseChain(raw);

  const statusText = single(raw.status, 'status')?.toUpperCase();
  if (
    statusText &&
    !(EVENT_STATUSES as readonly string[]).includes(statusText)
  ) {
    throw new InvalidEventQueryError(
      `status must be one of ${EVENT_STATUSES.map((s) => s.toLowerCase()).join(', ')}`,
    );
  }

  const from = parseDate(single(raw.from, 'from'), 'from');
  const to = parseDate(single(raw.to, 'to'), 'to');
  if (from && to && from.getTime() > to.getTime()) {
    throw new InvalidEventQueryError('from must be earlier than to');
  }

  const limitText = single(raw.limit, 'limit');
  let limit = DEFAULT_EVENT_LIMIT;
  if (limitText !== undefined) {
    limit = Number(limitText);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_EVENT_LIMIT) {
      throw new InvalidEventQueryError(
        `limit must be an integer between 1 and ${MAX_EVENT_LIMIT}`,
      );
    }
  }

  const cursorText = single(raw.cursor, 'cursor');

  return {
    chain,
    status: (statusText as EventStatus | undefined) ?? null,
    from,
    toExclusive: to ? new Date(to.getTime() + DAY_MS) : null,
    limit,
    cursor: cursorText ? decodeCursor(cursorText) : null,
  };
}
