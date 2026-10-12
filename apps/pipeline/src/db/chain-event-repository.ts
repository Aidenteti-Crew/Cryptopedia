import { v7 as uuidv7 } from 'uuid'

import { isCalendarEventKey, SAME_EVENT_WINDOW_MS, titlesMatch } from '../events/dedup.js'
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

export interface MatchedEvent {
  id: string
  eventKey: string
}

// Finds an active event on the same chain that starts within the window and has a matching
// title. Calendar (Luma) rows are preferred when several match, as the official event page.
export async function findMatchingEvent(
  query: QueryFn,
  chain: string,
  startsAt: Date | string,
  title: string
): Promise<MatchedEvent | null> {
  const start = new Date(startsAt)
  const result = await query(
    `SELECT id, event_key, title FROM content.chain_event
      WHERE chain = $1 AND revoked_at IS NULL
        AND starts_at BETWEEN $2::timestamptz AND $3::timestamptz`,
    [
      chain,
      new Date(start.getTime() - SAME_EVENT_WINDOW_MS),
      new Date(start.getTime() + SAME_EVENT_WINDOW_MS),
    ]
  )
  const matches = result.rows
    .map((r) => ({ id: String(r.id), eventKey: String(r.event_key), title: String(r.title) }))
    .filter((r) => titlesMatch(r.title, title))
    .sort((a, b) => Number(isCalendarEventKey(b.eventKey)) - Number(isCalendarEventKey(a.eventKey)))
  const best = matches[0]
  return best ? { id: best.id, eventKey: best.eventKey } : null
}

export async function linkEventSource(
  query: QueryFn,
  eventId: string,
  articleRawId: string | null,
  sourceUrl: string
): Promise<void> {
  await query(
    `INSERT INTO content.chain_event_source (id, chain_event_id, article_raw_id, source_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (chain_event_id, source_url) DO NOTHING`,
    [uuidv7(), eventId, articleRawId, sourceUrl]
  )
}

// After a calendar import: an event first created from a post (LLM path) that the calendar now
// also lists is folded into the calendar row. Its sources move over and the post-derived row is
// revoked, so the API shows the event once, with the official page as its source.
export async function absorbDuplicateEvents(query: QueryFn, chain: string): Promise<number> {
  const result = await query(
    `SELECT id, event_key, title, starts_at, first_article_raw_id, source_url
       FROM content.chain_event
      WHERE chain = $1 AND revoked_at IS NULL AND event_key NOT LIKE 'luma-%'`,
    [chain]
  )
  let absorbed = 0
  for (const row of result.rows) {
    const match = await findMatchingEvent(
      query,
      chain,
      row.starts_at as Date | string,
      String(row.title)
    )
    if (!match || !isCalendarEventKey(match.eventKey)) continue
    if (row.source_url) {
      await linkEventSource(
        query,
        match.id,
        (row.first_article_raw_id as string | null) ?? null,
        String(row.source_url)
      )
    }
    await query(
      `UPDATE content.chain_event SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
      [row.id]
    )
    absorbed++
  }
  return absorbed
}
