import type { EventEntry } from './chain-feed.types';
import { toLocalIso } from './event-format';
import type { EventStatus } from './event-query';

// A row of the status-annotated chain_event query in ChainFeedService.listEvents.
export interface EventRow {
  event_key: string;
  title: string;
  summary: string;
  starts_at: Date;
  ends_at: Date | null;
  timezone: string;
  all_day: boolean;
  organizer: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  country: string | null;
  is_online: boolean;
  source_url: string | null;
  registration_url: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  chain: string;
  project: string | null;
  published_at: Date | null;
  fetched_at: Date;
  confidence: string | number | null;
  status: EventStatus;
}

function displayChain(chain: string): string {
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

export function toEventEntry(row: EventRow): EventEntry {
  return {
    id: row.event_key,
    title: row.title,
    summary: row.summary,
    startsAt: toLocalIso(row.starts_at, row.timezone),
    endsAt: row.ends_at ? toLocalIso(row.ends_at, row.timezone) : null,
    timezone: row.timezone,
    allDay: row.all_day,
    status: row.status,
    organizer: row.organizer,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    city: row.city,
    country: row.country ? row.country.trim() : null,
    isOnline: row.is_online,
    sourceUrl: row.source_url,
    registrationUrl: row.registration_url,
    imageUrl: row.image_url,
    category: row.category,
    tags: row.tags ?? [],
    chain: displayChain(row.chain),
    project: row.project,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    fetchedAt: row.fetched_at.toISOString(),
    confidence: row.confidence === null ? null : Number(row.confidence),
  };
}
