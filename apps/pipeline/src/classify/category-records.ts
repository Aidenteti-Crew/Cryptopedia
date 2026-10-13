import { createHash } from 'node:crypto'

import { cleanTags, nonEmpty, safePublicUrl } from '../events/sanitize.js'
import type { Classification } from './schema.js'

export interface RecordArticle {
  id: string
  title: string
  publishedAt: Date
  contentKind: string
  chain: string
}

export interface MacroRecord {
  type: 'MACRO'
  chain: string
  kind: string
  relatedProject: string | null
  title: string
  summary: string
  importance: number
  publishedAt: Date
}

export interface TechRecord {
  type: 'TECH_UPDATE'
  chain: string
  kind: string
  network: string
  upgradeName: string | null
  version: string | null
  title: string
  changeSummary: string
  activatedAt: string | null
  importance: number
  publishedAt: Date
}

export interface EventRecord {
  type: 'EVENT'
  chain: string
  eventKey: string
  title: string
  summary: string
  startsAt: string
  endsAt: string | null
  timezone: string
  allDay: boolean
  organizer: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  country: string | null
  isOnline: boolean
  sourceUrl: string
  registrationUrl: string | null
  category: string
  tags: string[]
  statusOverride: string | null
  confidence: number | null
  importance: number
  publishedAt: Date
}

export interface GeneralRecord {
  type: 'GENERAL'
  chain: string
  title: string
  summary: string
  importance: number
  publishedAt: Date
}

export type CategoryRecord = MacroRecord | TechRecord | EventRecord | GeneralRecord

export interface RecordBuildResult {
  record: CategoryRecord | null
  // Why a classified article produced no category row, e.g. an event without a confirmed date.
  skippedReason?: string
}

const DAY_MS = 86_400_000
// An event more than this far from the post that announced it is almost certainly a wrong year.
const MAX_EVENT_DISTANCE_DAYS = 400

const KIND_BY_CONTENT_KIND: Record<string, string> = {
  RELEASE: 'RELEASE',
  GOVERNANCE: 'ACP',
  BLOG: 'BLOG',
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

function slug(value: string): string {
  const ascii = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // Titles with no latin letters (e.g. Korean) would collapse to an empty key.
  return ascii || createHash('md5').update(value).digest('hex').slice(0, 10)
}

function buildEvent(
  article: RecordArticle,
  c: Classification,
  sourceUrl: string
): RecordBuildResult {
  const event = c.event
  if (!event) return { record: null, skippedReason: 'event details missing' }
  if (!event.starts_at) return { record: null, skippedReason: 'event start date not confirmed' }
  if (!event.timezone || !isValidTimezone(event.timezone)) {
    return { record: null, skippedReason: 'event timezone missing or not an IANA name' }
  }
  const startsMs = Date.parse(event.starts_at)
  if (Math.abs(startsMs - article.publishedAt.getTime()) > MAX_EVENT_DISTANCE_DAYS * DAY_MS) {
    return { record: null, skippedReason: 'event date is implausibly far from the post date' }
  }
  const endsAt = event.ends_at && Date.parse(event.ends_at) >= startsMs ? event.ends_at : null
  const name = event.name ?? c.title_ko ?? article.title
  const country =
    event.country && /^[A-Za-z]{2}$/.test(event.country) ? event.country.toUpperCase() : null

  return {
    record: {
      type: 'EVENT',
      chain: article.chain,
      eventKey: clip(`${slug(name)}-${event.starts_at.slice(0, 10)}`, 200),
      title: clip(name, 500),
      summary: c.summary_ko,
      startsAt: event.starts_at,
      endsAt,
      timezone: event.timezone,
      allDay: event.all_day,
      organizer: nonEmpty(event.organizer, 200),
      venueName: nonEmpty(event.venue_name, 300),
      venueAddress: nonEmpty(event.venue_address, 500),
      city: nonEmpty(event.city, 100),
      country,
      isOnline: event.is_online,
      sourceUrl,
      registrationUrl: safePublicUrl(event.registration_url),
      category: event.category,
      tags: cleanTags(event.tags),
      statusOverride: event.status,
      confidence: event.confidence,
      importance: c.importance,
      publishedAt: article.publishedAt,
    },
  }
}

// Turns a validated classification into the row for its category table. Anything the text does
// not support (undated event, unknown timezone) is dropped here, never filled in.
export function buildCategoryRecord(
  article: RecordArticle,
  c: Classification,
  sourceUrl: string
): RecordBuildResult {
  const title = clip(c.title_ko ?? article.title, 500)

  switch (c.category) {
    case 'MACRO':
      return {
        record: {
          type: 'MACRO',
          chain: article.chain,
          kind: c.macro?.kind ?? 'OTHER',
          relatedProject: c.macro?.related_project ? clip(c.macro.related_project, 200) : null,
          title,
          summary: c.summary_ko,
          importance: c.importance,
          publishedAt: article.publishedAt,
        },
      }
    case 'TECH_UPDATE':
      return {
        record: {
          type: 'TECH_UPDATE',
          chain: article.chain,
          kind: KIND_BY_CONTENT_KIND[article.contentKind] ?? 'OTHER',
          network: c.tech?.network ?? 'OTHER',
          upgradeName: c.tech?.upgrade_name ? clip(c.tech.upgrade_name, 200) : null,
          version: c.tech?.version ? clip(c.tech.version, 100) : null,
          title,
          changeSummary: c.summary_ko,
          activatedAt: c.tech?.activated_at ?? null,
          importance: c.importance,
          publishedAt: article.publishedAt,
        },
      }
    case 'EVENT':
      return buildEvent(article, c, sourceUrl)
    case 'GENERAL':
      return {
        record: {
          type: 'GENERAL',
          chain: article.chain,
          title,
          summary: c.summary_ko,
          importance: c.importance,
          publishedAt: article.publishedAt,
        },
      }
    case 'NOISE':
      // Kept only as the classification record; nothing is shown for it.
      return { record: null }
  }
}
