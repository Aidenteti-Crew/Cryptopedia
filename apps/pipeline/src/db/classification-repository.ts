import { v7 as uuidv7 } from 'uuid'

import type {
  CategoryRecord,
  EventRecord,
  MacroRecord,
  TechRecord,
} from '../classify/category-records.js'
import type { ClassificationOutcome } from '../classify/classify-article.js'
import type { QueryFn } from './query.js'

export interface PendingArticle {
  id: string
  title: string
  url: string
  author: string | null
  body: string | null
  publishedAt: Date
  sourceName: string
  sourceUrl: string
}

export interface FetchPendingOptions {
  sourceUrls: string[]
  limit: number
  maxAttempts: number
}

// Only articles from the configured Avalanche sources are classified: content.article_raw is
// shared with the other collectors, and their rows are not ours to process. A row with no
// classification yet, or a FAILED one that still has attempts left, is pending.
export async function fetchPendingArticles(
  query: QueryFn,
  options: FetchPendingOptions
): Promise<PendingArticle[]> {
  const result = await query(
    `SELECT a.id, a.title, a.url, a.author, a.content_raw AS body, a.published_at,
            s.name AS source_name, s.url_handle AS source_url
       FROM content.article_raw a
       JOIN content.source s ON s.id = a.source_id
       LEFT JOIN content.article_classification c ON c.article_raw_id = a.id
      WHERE s.url_handle = ANY($1::text[])
        AND (c.id IS NULL OR (c.status = 'FAILED' AND c.attempts < $2))
      ORDER BY a.published_at DESC
      LIMIT $3`,
    [options.sourceUrls, options.maxAttempts, options.limit]
  )
  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    url: String(row.url),
    author: (row.author as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    publishedAt: new Date(row.published_at as string | Date),
    sourceName: String(row.source_name),
    sourceUrl: String(row.source_url),
  }))
}

// Node's Intl accepts some zone names Postgres does not know. An unknown one would make the events
// API fail on `AT TIME ZONE` for every request, so check against Postgres before storing an event.
export async function isKnownTimezone(query: QueryFn, name: string): Promise<boolean> {
  const result = await query('SELECT 1 FROM pg_timezone_names WHERE name = $1 LIMIT 1', [name])
  return (result.rowCount ?? 0) > 0
}

export async function saveClassificationSuccess(
  query: QueryFn,
  articleId: string,
  outcome: ClassificationOutcome,
  modelName: string
): Promise<void> {
  const { classification } = outcome
  await query(
    `INSERT INTO content.article_classification
       (id, article_raw_id, category, importance, status, model_name, raw_json, attempts, classified_at)
     VALUES ($1, $2, $3, $4, 'SUCCESS', $5, $6::jsonb, 1, now())
     ON CONFLICT (article_raw_id) DO UPDATE SET
       category = EXCLUDED.category,
       importance = EXCLUDED.importance,
       status = 'SUCCESS',
       model_name = EXCLUDED.model_name,
       raw_json = EXCLUDED.raw_json,
       error_msg = NULL,
       attempts = content.article_classification.attempts + 1,
       classified_at = now()`,
    [
      uuidv7(),
      articleId,
      classification.category,
      classification.importance,
      modelName,
      JSON.stringify(outcome.rawJson),
    ]
  )
}

export async function saveClassificationFailure(
  query: QueryFn,
  articleId: string,
  errorMessage: string,
  modelName: string
): Promise<void> {
  await query(
    `INSERT INTO content.article_classification
       (id, article_raw_id, status, model_name, error_msg, attempts)
     VALUES ($1, $2, 'FAILED', $3, $4, 1)
     ON CONFLICT (article_raw_id) DO UPDATE SET
       status = 'FAILED',
       model_name = EXCLUDED.model_name,
       error_msg = EXCLUDED.error_msg,
       attempts = content.article_classification.attempts + 1`,
    [uuidv7(), articleId, modelName, errorMessage.slice(0, 2000)]
  )
}

async function insertMacro(query: QueryFn, articleId: string, r: MacroRecord): Promise<boolean> {
  const result = await query(
    `INSERT INTO content.macro_news
       (id, article_raw_id, kind, related_project, title, summary, importance, published_at, chain)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (article_raw_id) WHERE (revoked_at IS NULL) DO NOTHING`,
    [
      uuidv7(),
      articleId,
      r.kind,
      r.relatedProject,
      r.title,
      r.summary,
      r.importance,
      r.publishedAt,
      r.chain,
    ]
  )
  return (result.rowCount ?? 0) > 0
}

async function insertTech(query: QueryFn, articleId: string, r: TechRecord): Promise<boolean> {
  const result = await query(
    `INSERT INTO content.tech_update
       (id, article_raw_id, kind, network, upgrade_name, version, title, change_summary,
        activated_at, importance, published_at, chain)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (article_raw_id) WHERE (revoked_at IS NULL) DO NOTHING`,
    [
      uuidv7(),
      articleId,
      r.kind,
      r.network,
      r.upgradeName,
      r.version,
      r.title,
      r.changeSummary,
      r.activatedAt,
      r.importance,
      r.publishedAt,
      r.chain,
    ]
  )
  return (result.rowCount ?? 0) > 0
}

// The same event is often announced several times; the stable (chain, event_key) keeps the first row.
async function insertEvent(query: QueryFn, articleId: string, r: EventRecord): Promise<boolean> {
  const result = await query(
    `INSERT INTO content.chain_event
       (id, event_key, first_article_raw_id, title, summary, starts_at, ends_at, timezone, all_day,
        organizer, venue_name, venue_address, city, country, is_online, source_url,
        registration_url, category, tags, status_override, confidence, importance, published_at,
        chain)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
             $19, $20, $21, $22, $23, $24)
     ON CONFLICT (chain, event_key) WHERE (revoked_at IS NULL) DO NOTHING`,
    [
      uuidv7(),
      r.eventKey,
      articleId,
      r.title,
      r.summary,
      r.startsAt,
      r.endsAt,
      r.timezone,
      r.allDay,
      r.organizer,
      r.venueName,
      r.venueAddress,
      r.city,
      r.country,
      r.isOnline,
      r.sourceUrl,
      r.registrationUrl,
      r.category,
      r.tags,
      r.statusOverride,
      r.confidence,
      r.importance,
      r.publishedAt,
      r.chain,
    ]
  )
  return (result.rowCount ?? 0) > 0
}

// Returns false when the row already existed (idempotent re-run or a duplicate event).
export async function insertCategoryRecord(
  query: QueryFn,
  articleId: string,
  record: CategoryRecord
): Promise<boolean> {
  switch (record.type) {
    case 'MACRO':
      return insertMacro(query, articleId, record)
    case 'TECH_UPDATE':
      return insertTech(query, articleId, record)
    case 'EVENT':
      return insertEvent(query, articleId, record)
  }
}
