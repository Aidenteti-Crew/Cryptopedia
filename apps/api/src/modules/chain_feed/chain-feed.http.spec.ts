import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import knex, { Knex } from 'knex';
import request from 'supertest';
import { ChainFeedService } from './chain-feed.service';
import { EcosystemController, EventsController } from './chain-feed.controller';

async function appWith(db: unknown): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [EventsController, EcosystemController],
    providers: [ChainFeedService, { provide: 'KNEX_CONNECTION', useValue: db }],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  await app.init();
  return app;
}

describe('chain feed HTTP contract: validation and errors (no database needed)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Any query that gets this far fails with a message containing secrets, to prove it never
    // reaches the response.
    app = await appWith({
      raw: () =>
        Promise.reject(
          new Error('connect failed postgres://admin:hunter2@db.internal/x'),
        ),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers a bad events query with 400 and {code, message}', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?from=2026-12-31&to=2026-10-01')
      .expect(400);

    expect(res.body).toEqual({
      code: 'INVALID_EVENT_QUERY',
      message: 'from must be earlier than to',
    });
  });

  it.each([
    '/events?limit=500',
    '/events?status=soon',
    '/events?cursor=garbage',
  ])('rejects %s with INVALID_EVENT_QUERY', async (path) => {
    const res = await request(app.getHttpServer()).get(path).expect(400);
    expect(res.body.code).toBe('INVALID_EVENT_QUERY');
  });

  it.each([
    '/ecosystem/macro?sort=random',
    '/ecosystem/updates?minImportance=9',
    '/ecosystem/projects?limit=0',
  ])('rejects %s with INVALID_FEED_QUERY', async (path) => {
    const res = await request(app.getHttpServer()).get(path).expect(400);
    expect(res.body.code).toBe('INVALID_FEED_QUERY');
  });

  it('turns a database failure into a bare 500 that leaks nothing', async () => {
    for (const path of ['/events', '/ecosystem', '/ecosystem/projects']) {
      const res = await request(app.getHttpServer()).get(path).expect(500);
      expect(JSON.stringify(res.body)).not.toMatch(
        /hunter2|postgres:|admin|connect failed/,
      );
    }
  });
});

const url = process.env.TEST_DATABASE_URL;
const maybe = url ? describe : describe.skip;

maybe('chain feed HTTP contract (real Postgres)', () => {
  let db: Knex;
  let app: INestApplication;
  const CHAIN = `itest-http-${Date.now()}`;
  const CATEGORY = `itest-cat-${Date.now()}`;

  beforeAll(async () => {
    db = knex({ client: 'pg', connection: url });
    app = await appWith(db);
    await db.raw(
      `INSERT INTO content.chain_event (id, event_key, title, summary, starts_at, timezone, chain)
       VALUES (gen_random_uuid(), ?, 'Seoul Meetup', '요약', '2099-11-28T05:00:00Z', 'Asia/Seoul', ?)`,
      [`${CHAIN}-1`, CHAIN],
    );
    await db.raw(
      `INSERT INTO content.eco_project (id, chain, external_key, name, category, chains)
       VALUES (gen_random_uuid(), ?, ?, 'Itest Project', ?, ARRAY['C-Chain'])`,
      [CHAIN, CATEGORY, CATEGORY],
    );
  });

  afterAll(async () => {
    await db.raw('DELETE FROM content.chain_event WHERE chain = ?', [CHAIN]);
    await db.raw('DELETE FROM content.eco_project WHERE external_key = ?', [
      CATEGORY,
    ]);
    await app.close();
    await db.destroy();
  });

  it('serves the EventFeedResponse shape', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/events?chain=${CHAIN}&status=upcoming&from=2099-11-01&to=2099-12-31&limit=20`,
      )
      .expect(200);

    expect(res.body).toEqual({
      items: [
        expect.objectContaining({
          id: `${CHAIN}-1`,
          title: 'Seoul Meetup',
          startsAt: '2099-11-28T14:00:00+09:00',
          status: 'UPCOMING',
          timezone: 'Asia/Seoul',
          tags: [],
          sourceUrl: null,
        }),
      ],
      nextCursor: null,
      generatedAt: expect.stringMatching(/Z$/),
    });
  });

  it('returns 200 with an empty list for a chain with no events', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?chain=nothing-here')
      .expect(200);

    expect(res.body.items).toEqual([]);
  });

  it('serves the project directory with category counts and a category filter', async () => {
    const res = await request(app.getHttpServer())
      .get(`/ecosystem/projects?chain=${CHAIN}&category=${CATEGORY}`)
      .expect(200);

    expect(res.body.items).toEqual([
      expect.objectContaining({
        key: CATEGORY,
        name: 'Itest Project',
        chains: ['C-Chain'],
      }),
    ]);
    expect(res.body.categories).toEqual(
      expect.arrayContaining([{ name: CATEGORY, count: 1 }]),
    );
    expect(res.body.total).toBe(1);
  });

  it("keeps each chain separate: the default chain does not see another chain's rows", async () => {
    const avalanche = await request(app.getHttpServer())
      .get(`/ecosystem/projects?category=${CATEGORY}`)
      .expect(200);
    expect(avalanche.body.items).toEqual([]);

    const hub = await request(app.getHttpServer())
      .get(`/ecosystem?chain=${CHAIN}`)
      .expect(200);
    expect(hub.body.projects).toEqual({
      total: 1,
      categories: [{ name: CATEGORY, count: 1 }],
    });
    expect(hub.body.events.map((e: { id: string }) => e.id)).toEqual([
      `${CHAIN}-1`,
    ]);

    await request(app.getHttpServer())
      .get('/ecosystem?chain=Bad Chain!')
      .expect(400);
  });

  it('serves macro, updates and the combined hub', async () => {
    for (const path of [
      '/ecosystem/macro?limit=3',
      '/ecosystem/general?limit=3',
      '/ecosystem/updates?limit=3&sort=importance',
    ]) {
      const res = await request(app.getHttpServer()).get(path).expect(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeLessThanOrEqual(3);
    }

    const hub = await request(app.getHttpServer())
      .get('/ecosystem')
      .expect(200);
    expect(Object.keys(hub.body).sort()).toEqual([
      'events',
      'general',
      'generatedAt',
      'macro',
      'projects',
      'updates',
    ]);
    expect(hub.body.projects).toEqual({
      total: expect.any(Number),
      categories: expect.any(Array),
    });
  });
});
