import {
  decodeCursor,
  encodeCursor,
  InvalidEventQueryError,
  parseEventQuery,
} from './event-query';

const UUID = '0197f7c0-1234-7abc-8def-0123456789ab';

describe('parseEventQuery', () => {
  it('applies the documented defaults', () => {
    expect(parseEventQuery({})).toEqual({
      chain: 'avalanche',
      status: null,
      from: null,
      toExclusive: null,
      limit: 20,
      cursor: null,
    });
  });

  it('reads status case-insensitively and turns the date range into UTC bounds', () => {
    const q = parseEventQuery({
      chain: 'Avalanche',
      status: 'upcoming',
      from: '2026-10-01',
      to: '2026-12-31',
      limit: '50',
    });

    expect(q.status).toBe('UPCOMING');
    expect(q.from?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    // `to` is inclusive of that whole day, so the bound is the start of the next day.
    expect(q.toExclusive?.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(q.limit).toBe(50);
  });

  it('allows from equal to to (a single day)', () => {
    expect(() =>
      parseEventQuery({ from: '2026-11-28', to: '2026-11-28' }),
    ).not.toThrow();
  });

  it.each([
    [{ from: '2026-12-31', to: '2026-10-01' }, 'from must be earlier than to'],
    [{ from: '2026-13-01' }, 'not a real date'],
    [{ from: '2026-02-31' }, 'not a real date'],
    [{ to: '10/01/2026' }, 'YYYY-MM-DD'],
    [{ status: 'soon' }, 'status must be one of'],
    [{ limit: '0' }, 'limit must be'],
    [{ limit: '101' }, 'limit must be'],
    [{ limit: '2.5' }, 'limit must be'],
    [{ limit: 'abc' }, 'limit must be'],
    [{ chain: 'bad chain!' }, 'chain is not valid'],
    [{ status: ['upcoming', 'past'] }, 'must be given once'],
    [{ cursor: 'not-a-cursor' }, 'cursor is not valid'],
  ])('rejects %j', (input, message) => {
    expect(() => parseEventQuery(input)).toThrow(InvalidEventQueryError);
    expect(() => parseEventQuery(input)).toThrow(message);
  });
});

describe('cursor', () => {
  it('round-trips and is accepted by parseEventQuery', () => {
    const cursor = { startsAt: '2026-11-28T05:00:00.000Z', id: UUID };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    expect(parseEventQuery({ cursor: encodeCursor(cursor) }).cursor).toEqual(
      cursor,
    );
  });

  it('rejects tampered cursors', () => {
    const bad = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');

    expect(() => decodeCursor(bad({ s: 'yesterday', i: UUID }))).toThrow(
      'cursor is not valid',
    );
    expect(() =>
      decodeCursor(bad({ s: '2026-11-28T05:00:00Z', i: "1'; DROP TABLE x" })),
    ).toThrow('cursor is not valid');
    expect(() => decodeCursor(bad({}))).toThrow('cursor is not valid');
  });
});
