// A row for content.chain_event as written by a structured source (a calendar feed). The
// LLM path has its own EventRecord in classify/category-records.ts.
export interface ChainEventInput {
  chain: string
  eventKey: string
  title: string
  summary: string
  startsAt: Date
  endsAt: Date | null
  timezone: string
  allDay: boolean
  organizer: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  country: string | null
  isOnline: boolean
  sourceUrl: string | null
  registrationUrl: string | null
  category: string
  tags: string[]
  statusOverride: 'CANCELLED' | 'POSTPONED' | null
  confidence: number | null
  publishedAt: Date | null
}
