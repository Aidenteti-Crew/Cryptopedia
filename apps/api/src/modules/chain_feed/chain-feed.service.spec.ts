import knex, { Knex } from 'knex';
import { ChainFeedService } from './chain-feed.service';
import { parseEventQuery } from './event-query';

// Runs against a real Postgres that has docs/architecture/avalanche-categories-2026-10-12.sql:
//   TEST_DATABASE_URL=postgresql://cherry:cherry_dev@localhost:5432/cherry_db pnpm --filter api test chain-feed
// Event status comes from SQL (time zones, partial indexes), which a mock cannot check.
const url = process.env.TEST_DATABASE_URL;
const maybe = url ? describe : describe.skip;

const NOW = new Date('2026-10-15T12:00:00Z');
const CHAIN = `itest-${Date.now()}`;

interface Fixture {
  key: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  override?: 'CANCELLED' | 'POSTPONED';
}

const FIXTURES: Fixture[] = [
  {
    key: 'postponed',
    startsAt: '2026-10-01T00:00:00Z',
    timezone: 'Asia/Seoul',
    override: 'POSTPONED',
  },
  // starts 23:00 New York time on the 13th, no end: over once the local day ended at 00:00 on the 14th
  {
    key: 'past-no-end',
    startsAt: '2026-10-14T03:00:00Z',
    timezone: 'America/New_York',
  },
  {
    key: 'ongoing-with-end',
    startsAt: '2026-10-15T00:00:00Z',
    endsAt: '2026-10-16T00:00:00Z',
    timezone: 'UTC',
  },
  // 10:00 in Seoul on the 15th, no end: still the same local day at 12:00Z (21:00 KST)
  {
    key: 'ongoing-no-end',
    startsAt: '2026-10-15T01:00:00Z',
    timezone: 'Asia/Seoul',
  },
  {
    key: 'upcoming-seoul',
    startsAt: '2026-11-28T05:00:00Z',
    timezone: 'Asia/Seoul',
  },
  {
    key: 'cancelled',
    startsAt: '2026-12-01T00:00:00Z',
    timezone: 'UTC',
    override: 'CANCELLED',
  },
  { key: 'upcoming-later', startsAt: '2026-12-05T00:00:00Z', timezone: 'UTC' },
];

maybe('ChainFeedService.listEvents (real Postgres)', () => {
  let db: Knex;
  let service: ChainFeedService;

  const list = async (params: Record<string, string> = {}) =>
    service.listEvents(parseEventQuery({ chain: CHAIN, ...params }), NOW);
  const keys = (response: { items: { id: string }[] }) =>
    response.items.map((e) => e.id);

  beforeAll(async () => {
    db = knex({ client: 'pg', connection: url });
    service = new ChainFeedService(db);
    for (const f of FIXTURES) {
      await db.raw(
        `INSERT INTO content.chain_event
           (id, event_key, title, summary, starts_at, ends_at, timezone, chain, status_override, country, tags)
         VALUES (gen_random_uuid(), ?, ?, '요약', ?, ?, ?, ?, ?, 'KR', ARRAY['Avalanche'])`,
        [
          f.key,
          `Event ${f.key}`,
          f.startsAt,
          f.endsAt ?? null,
          f.timezone,
          CHAIN,
          f.override ?? null,
        ],
      );
    }
  });

  afterAll(async () => {
    await db.raw('DELETE FROM content.chain_event WHERE chain = ?', [CHAIN]);
    await db.destroy();
  });

  it('orders ascending by start time when no status is given', async () => {
    expect(keys(await list())).toEqual([
      'postponed',
      'past-no-end',
      'ongoing-with-end',
      'ongoing-no-end',
      'upcoming-seoul',
      'cancelled',
      'upcoming-later',
    ]);
  });

  it('computes status at request time, with cancel/postpone overriding the clock', async () => {
    expect(keys(await list({ status: 'upcoming' }))).toEqual([
      'upcoming-seoul',
      'upcoming-later',
    ]);
    expect(keys(await list({ status: 'ongoing' }))).toEqual([
      'ongoing-with-end',
      'ongoing-no-end',
    ]);
    expect(keys(await list({ status: 'cancelled' }))).toEqual(['cancelled']);
    expect(keys(await list({ status: 'postponed' }))).toEqual(['postponed']);
  });

  it('treats an event with no end time as over only after its local day ends', async () => {
    const all = (await list()).items;

    expect(all.find((e) => e.id === 'past-no-end')?.status).toBe('PAST');
    expect(all.find((e) => e.id === 'ongoing-no-end')?.status).toBe('ONGOING');
    // The same instant a few hours later flips it, proving status is not stored.
    const later = await service.listEvents(
      parseEventQuery({ chain: CHAIN, status: 'past' }),
      new Date('2026-10-15T16:00:00Z'),
    );
    expect(keys(later)).toContain('ongoing-no-end');
  });

  it('lists past events newest first', async () => {
    const past = await list({ status: 'past' });

    expect(keys(past)).toEqual(['past-no-end']);
    const lateNow = await service.listEvents(
      parseEventQuery({ chain: CHAIN, status: 'past' }),
      new Date('2027-01-01T00:00:00Z'),
    );
    expect(keys(lateNow)).toEqual([
      'upcoming-later',
      'upcoming-seoul',
      'ongoing-no-end',
      'ongoing-with-end',
      'past-no-end',
    ]);
  });

  it('pages through every event exactly once with the cursor', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await list({ limit: '3', ...(cursor ? { cursor } : {}) });
      seen.push(...keys(page));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect(seen).toEqual(keys(await list()));
    expect(new Set(seen).size).toBe(FIXTURES.length);
  });

  it('filters by start date, inclusive of the whole "to" day', async () => {
    expect(keys(await list({ from: '2026-11-28', to: '2026-11-28' }))).toEqual([
      'upcoming-seoul',
    ]);
    expect(keys(await list({ from: '2026-12-01', to: '2026-12-05' }))).toEqual([
      'cancelled',
      'upcoming-later',
    ]);
  });

  it('formats times in the event time zone with an offset and returns the contract fields', async () => {
    const seoul = (await list()).items.find((e) => e.id === 'upcoming-seoul');

    expect(seoul).toMatchObject({
      startsAt: '2026-11-28T14:00:00+09:00',
      endsAt: null,
      timezone: 'Asia/Seoul',
      status: 'UPCOMING',
      country: 'KR',
      tags: ['Avalanche'],
      chain: expect.stringMatching(/^Itest-/),
      confidence: null,
      isOnline: false,
    });
    expect(seoul?.fetchedAt).toMatch(/Z$/);
  });

  it('returns an empty list, not an error, for a chain with no events', async () => {
    const empty = await service.listEvents(
      parseEventQuery({ chain: 'nothing-here' }),
      NOW,
    );

    expect(empty).toEqual({
      items: [],
      nextCursor: null,
      generatedAt: NOW.toISOString(),
    });
  });

  it('drops an item that would break the frontend schema instead of returning it', async () => {
    await db.raw(
      `INSERT INTO content.chain_event
         (id, event_key, title, summary, starts_at, timezone, chain, registration_url)
       VALUES (gen_random_uuid(), 'bad-link', 'Bad link', '요약', '2026-12-10T00:00:00Z', 'UTC', ?, 'lu.ma/no-scheme')`,
      [CHAIN],
    );

    const ids = keys(await list());

    expect(ids).not.toContain('bad-link');
    expect(ids).toContain('upcoming-later');
  });
});
