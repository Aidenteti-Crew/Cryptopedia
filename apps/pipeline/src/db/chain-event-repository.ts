import { v7 as uuidv7 } from 'uuid'

import type { ChainEventInput } from '../events/types.js'
import type { QueryFn } from './query.js'

export interface UpsertChainEventsResult {
  inserted: number
  updated: number
}

// A calendar feed is the source of truth for its events, so a repeated event key updates the
// row (rescheduled time, revealed address) instead of keeping the first version. importance and
// first_article_raw_id are left alone: the feed does not provide them.
export async function upsertChainEvents(
  query: QueryFn,
  events: ChainEventInput[]
): Promise<UpsertChainEventsResult> {
  let inserted = 0
  let updated = 0
  for (const e of events) {
    const result = await query(
      `INSERT INTO content.chain_event
         (id, chain, event_key, title, summary, starts_at, ends_at, timezone, all_day, organizer,
          venue_name, venue_address, city, country, is_online, source_url, registration_url,
          category, tags, status_override, confidence, published_at, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
               $19, $20, $21, $22, now())
       ON CONFLICT (chain, event_key) WHERE (revoked_at IS NULL) DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         starts_at = EXCLUDED.starts_at,
         ends_at = EXCLUDED.ends_at,
         timezone = EXCLUDED.timezone,
         all_day = EXCLUDED.all_day,
         organizer = EXCLUDED.organizer,
         venue_name = EXCLUDED.venue_name,
         venue_address = EXCLUDED.venue_address,
         city = EXCLUDED.city,
         country = EXCLUDED.country,
         is_online = EXCLUDED.is_online,
         source_url = EXCLUDED.source_url,
         registration_url = EXCLUDED.registration_url,
         category = EXCLUDED.category,
         tags = EXCLUDED.tags,
         status_override = EXCLUDED.status_override,
         confidence = EXCLUDED.confidence,
         fetched_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [
        uuidv7(),
        e.chain,
        e.eventKey,
        e.title,
        e.summary,
        e.startsAt,
        e.endsAt,
        e.timezone,
        e.allDay,
        e.organizer,
        e.venueName,
        e.venueAddress,
        e.city,
        e.country,
        e.isOnline,
        e.sourceUrl,
        e.registrationUrl,
        e.category,
        e.tags,
        e.statusOverride,
        e.confidence,
        e.publishedAt,
      ]
    )
    const row = result.rows[0] as { inserted: boolean } | undefined
    if (row?.inserted) inserted++
    else updated++
  }
  return { inserted, updated }
}
