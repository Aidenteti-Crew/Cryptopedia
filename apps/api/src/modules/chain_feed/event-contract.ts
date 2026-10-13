import { z } from 'zod';

// Copy of eventEntrySchema in apps/web/lib/cryptopedia-types.ts (keep the two in sync). The
// frontend parses the whole response with it, so a single item that fails would make the page
// reject every event; the service drops such items before responding instead.
const isoDateTime = z.string().datetime({ offset: true });

export const eventEntryContract = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  startsAt: isoDateTime,
  endsAt: isoDateTime.nullable(),
  timezone: z.string().min(1),
  allDay: z.boolean(),
  status: z.enum(['UPCOMING', 'ONGOING', 'PAST', 'CANCELLED', 'POSTPONED']),
  organizer: z.string().min(1).nullable(),
  venueName: z.string().min(1).nullable(),
  venueAddress: z.string().min(1).nullable(),
  city: z.string().min(1).nullable(),
  country: z.string().min(1).nullable(),
  isOnline: z.boolean(),
  sourceUrl: z.string().url().nullable(),
  registrationUrl: z.string().url().nullable(),
  imageUrl: z.string().url().nullable(),
  category: z.string().min(1).nullable(),
  tags: z.array(z.string().min(1)),
  chain: z.string().min(1).nullable(),
  project: z.string().min(1).nullable(),
  publishedAt: isoDateTime.nullable(),
  fetchedAt: isoDateTime,
  confidence: z.number().min(0).max(1).nullable(),
});
