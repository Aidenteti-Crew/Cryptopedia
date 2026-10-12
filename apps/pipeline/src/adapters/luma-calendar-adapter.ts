import { createHash } from 'node:crypto'

import tzlookup from '@photostructure/tz-lookup'
import { iso1A2Code } from '@rapideditor/country-coder'

import type { SourceConfig } from '../config/source-config.js'
import { parseIcsDate, parseIcsEvents, unescapeText, type IcsEvent } from '../events/ics.js'
import { cleanTags, nonEmpty, safePublicUrl } from '../events/sanitize.js'
import { countryCodeFromName, zonedTimeToInstant } from '../events/time.js'
import type { ChainEventInput } from '../events/types.js'
import type { AdapterCursor } from '../ingestion/contracts.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface CalendarCollectionResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  events: ChainEventInput[]
  skipped: Record<string, number>
  cursor: AdapterCursor
}

const ADDRESS_HIDDEN = /check event page/i
const ONLINE_HINT =
  /\b(online|virtual|webinar|ama|x space|twitter space|livestream|live stream|google meet|zoom|discord|teams)\b|온라인|웨비나/i

interface Description {
  summary: string
  pageUrl: string | null
  venueName: string | null
  city: string | null
  countryName: string | null
}

// Luma's DESCRIPTION is generated text. The address block comes in two shapes:
//   Address:                       Address:
//   서울용산시제품제작소             Campus San Joaquín, Pontificia Universidad Catolica de Chile
//   Seoul, South Korea             Sala AE 201, Ingeniería Comercial
//                                  Macul, Región Metropolitana
//                                  Chile
// and reads "Check event page for more details." when the host hides the address.
function parseDescription(raw: string | undefined, location: string): Description {
  const text = unescapeText(raw ?? '')
  const pageUrl = /Get up-to-date information at:\s*(\S+)/i.exec(text)?.[1] ?? null
  let venueName: string | null = null
  let city: string | null = null
  let countryName: string | null = null

  const address = /Address:\n([\s\S]*?)(?:\n\n|$)/.exec(text)?.[1]
  if (address && !ADDRESS_HIDDEN.test(address)) {
    const lines = address
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const last = lines[lines.length - 1] ?? ''
    const lastSegment = last.slice(last.lastIndexOf(',') + 1).trim()
    let cityLine: string | null = null
    if (countryCodeFromName(last)) {
      countryName = last
      cityLine = lines.length >= 3 ? (lines[lines.length - 2] ?? null) : null
    } else if (last.includes(',') && countryCodeFromName(lastSegment)) {
      countryName = lastSegment
      cityLine = last
    }
    city = cityLine ? (cityLine.split(',')[0]?.trim() ?? null) : null
    const first = lines[0] ?? null
    venueName = first && first !== cityLine && first !== countryName ? first : null
  }

  // Fall back to the full address, which usually ends with the country.
  if (!countryName && location && !/^https?:\/\//i.test(location)) {
    const tail = location.slice(location.lastIndexOf(',') + 1).trim()
    if (countryCodeFromName(tail)) countryName = tail
  }

  const summary = text
    .replace(/Get up-to-date information at:\s*\S+/i, '')
    .replace(/Address:\n[\s\S]*?(?:\n\n|$)/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { summary, pageUrl, venueName, city, countryName }
}

function categoryOf(title: string): string {
  // Hackathon, Hackday, UniHack, Hack4Bengal, Buildathon ...
  if (/hack|buildathon|해커톤/i.test(title)) return 'HACKATHON'
  if (/trading (competition|contest)|trading comp|트레이딩/i.test(title)) return 'TRADING_CONTEST'
  if (/summit|conference|컨퍼런스|서밋/i.test(title)) return 'CONFERENCE'
  return 'COMMUNITY'
}

function parseGeo(value: string | undefined): { lat: number; lon: number } | null {
  const [lat, lon] = (value ?? '').split(';').map(Number)
  if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}

export type LumaMapping = { event: ChainEventInput } | { skippedReason: string }

// Maps one VEVENT. Times, the stable id and the event page come straight from the feed; the
// timezone comes from the event's coordinates. An event without coordinates is not assumed to be
// online (in Team1's calendar most of them are in-person events whose venue is not public yet):
// it is "venue to be announced", shown in UTC with a lower confidence, and only marked online
// when its title or description says so.
export function mapLumaEvent(
  ev: IcsEvent,
  context: { chain: string; calendarName: string }
): LumaMapping {
  const uid = ev.UID?.value.trim()
  const title = nonEmpty(unescapeText(ev.SUMMARY?.value ?? ''), 500)
  if (!uid) return { skippedReason: 'missing UID' }
  if (!title) return { skippedReason: 'missing title' }

  const geo = parseGeo(ev.GEO?.value)
  let timezone = 'UTC'
  if (geo) {
    try {
      timezone = tzlookup(geo.lat, geo.lon)
    } catch {
      return { skippedReason: 'coordinates outside any timezone' }
    }
  }

  const start = parseIcsDate(ev.DTSTART)
  const end = parseIcsDate(ev.DTEND)
  if (!start) return { skippedReason: 'start time missing or unsupported' }
  const toInstant = (d: NonNullable<typeof start>): Date =>
    d.instant ??
    (d.date
      ? zonedTimeToInstant(`${d.date}T00:00:00`, timezone)
      : zonedTimeToInstant(d.local!.wallClock, d.local!.timeZone))
  const startsAt = toInstant(start)
  let endsAt = end ? toInstant(end) : null
  if (endsAt && endsAt.getTime() < startsAt.getTime()) endsAt = null

  const location = unescapeText(ev.LOCATION?.value ?? '').trim()
  const description = parseDescription(ev.DESCRIPTION?.value, location)
  const locationIsUrl = /^https?:\/\//i.test(location)
  const pageUrl = safePublicUrl(description.pageUrl)
  const organizer = nonEmpty(ev.ORGANIZER?.params.CN, 200) ?? nonEmpty(context.calendarName, 200)
  const status = ev.STATUS?.value.trim().toUpperCase()

  return {
    event: {
      chain: context.chain,
      eventKey: `luma-${uid.replace(/@.*$/, '')}`.slice(0, 200),
      title,
      summary: description.summary,
      startsAt,
      endsAt,
      timezone,
      allDay: start.date !== null,
      organizer,
      venueName: nonEmpty(description.venueName, 300),
      venueAddress: locationIsUrl ? null : nonEmpty(location, 500),
      city: nonEmpty(description.city, 100),
      // Coordinates decide the country when present (hosts often hide the address but Luma still
      // exports the point); the address text is the fallback.
      country:
        (geo ? iso1A2Code([geo.lon, geo.lat]) : null) ??
        countryCodeFromName(description.countryName),
      isOnline: !geo && ONLINE_HINT.test(`${title} ${description.summary} ${location}`),
      // The Luma page is the official event page, so it is the source; registration happens
      // on the same page, which the contract says to leave as null.
      sourceUrl: pageUrl ?? (locationIsUrl ? safePublicUrl(location) : null),
      registrationUrl: null,
      category: categoryOf(title),
      tags: cleanTags(['Avalanche', 'Team1', context.calendarName]),
      statusOverride: status === 'CANCELLED' ? 'CANCELLED' : null,
      confidence: geo ? 1 : 0.7,
      publishedAt: null,
    },
  }
}

// DTSTAMP is the export time and changes on every request, so it is left out of the hash that
// decides whether the calendar changed.
function contentHash(ics: string): string {
  const stable = ics.replace(/^DTSTAMP[^\n]*\n/gm, '')
  return createHash('sha256').update(stable).digest('hex')
}

// Reads a public Luma calendar through its iCalendar export (the "subscribe" feed).
export class LumaCalendarAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.lu.ma'
  ) {}

  async collect(
    source: SourceConfig,
    cursor: AdapterCursor = {}
  ): Promise<CalendarCollectionResult> {
    if (source.adapter !== 'LUMA_ICS' || !source.luma) {
      throw new Error('LumaCalendarAdapter requires adapter=LUMA_ICS with luma config')
    }
    const url = `${this.apiBase}/ics/get?entity=calendar&id=${encodeURIComponent(source.luma.calendarId)}`
    const response = await this.fetchFn(url, {
      headers: { 'User-Agent': 'cryptopedia-crawler', Accept: 'text/calendar' },
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) {
      throw new Error(`Luma calendar request failed: ${response.status} ${response.statusText}`)
    }
    const ics = (await response.text()).replace(/\r\n/g, '\n')
    if (!ics.startsWith('BEGIN:VCALENDAR')) {
      throw new Error('Luma calendar response is not an iCalendar document')
    }

    const hash = contentHash(ics)
    if (hash === cursor.value) return { status: 'NOT_MODIFIED', events: [], skipped: {}, cursor }

    const calendarName =
      unescapeText(/^X-WR-CALNAME:(.*)$/m.exec(ics)?.[1]?.trim() ?? '') || source.sourceName
    const events: ChainEventInput[] = []
    const skipped: Record<string, number> = {}
    for (const ev of parseIcsEvents(ics)) {
      const mapped = mapLumaEvent(ev, { chain: source.chain, calendarName })
      if ('event' in mapped) events.push(mapped.event)
      else skipped[mapped.skippedReason] = (skipped[mapped.skippedReason] ?? 0) + 1
    }
    return { status: 'SUCCESS', events, skipped, cursor: { value: hash } }
  }
}
