import { InvalidEventQueryError } from './event-query';
import {
  parseContentFeedQuery,
  parseProjectsQuery,
  parseUpdateQuery,
} from './feed-query';

describe('update cursor', () => {
  it('validates a publication date and UUID before constructing SQL bindings', () => {
    const before = {
      publishedAt: '2026-10-01T00:00:00Z',
      id: '00000000-0000-4000-8000-000000000001',
    };
    const cursor = Buffer.from(JSON.stringify(before)).toString('base64url');
    expect(parseUpdateQuery({ cursor }).before).toEqual(before);
    expect(() => parseUpdateQuery({ cursor, sort: 'importance' })).toThrow(
      InvalidEventQueryError,
    );
    expect(() => parseUpdateQuery({ cursor: 'not-json' })).toThrow(
      InvalidEventQueryError,
    );
    expect(() =>
      parseUpdateQuery({
        cursor: Buffer.from(
          JSON.stringify({ ...before, id: "'; DROP TABLE" }),
        ).toString('base64url'),
      }),
    ).toThrow(InvalidEventQueryError);
  });
});

describe('parseContentFeedQuery', () => {
  it('defaults to the 30 latest', () => {
    expect(parseContentFeedQuery({})).toEqual({
      chain: 'avalanche',
      limit: 30,
      minImportance: null,
      sort: 'latest',
    });
  });

  it('reads the chain case-insensitively', () => {
    expect(parseContentFeedQuery({ chain: 'Avalanche' }).chain).toBe(
      'avalanche',
    );
    expect(parseProjectsQuery({ chain: 'other-chain' }).chain).toBe(
      'other-chain',
    );
  });

  it('accepts importance filtering and sorting', () => {
    expect(
      parseContentFeedQuery({
        limit: '5',
        minImportance: '4',
        sort: 'importance',
      }),
    ).toEqual({
      chain: 'avalanche',
      limit: 5,
      minImportance: 4,
      sort: 'importance',
    });
  });

  it.each([
    { limit: '0' },
    { limit: '101' },
    { minImportance: '6' },
    { sort: 'random' },
    { chain: 'Not A Chain!' },
  ])('rejects %j', (input) => {
    expect(() => parseContentFeedQuery(input)).toThrow(InvalidEventQueryError);
  });
});

describe('parseProjectsQuery', () => {
  it('accepts a validated name/id cursor only for name ordering', () => {
    const after = {
      name: 'Project name',
      id: '00000000-0000-4000-8000-000000000001',
    };
    const cursor = Buffer.from(JSON.stringify(after)).toString('base64url');
    expect(parseProjectsQuery({ cursor }).after).toEqual(after);
    expect(() => parseProjectsQuery({ cursor, sort: 'importance' })).toThrow(
      InvalidEventQueryError,
    );
    expect(() => parseProjectsQuery({ cursor: 'invalid' })).toThrow(
      InvalidEventQueryError,
    );
  });
  it('defaults to all projects and allows a category filter', () => {
    expect(parseProjectsQuery({})).toEqual({
      chain: 'avalanche',
      category: null,
      sort: 'name',
      limit: 500,
    });
    expect(parseProjectsQuery({ category: 'DeFi', limit: '10' })).toEqual({
      chain: 'avalanche',
      category: 'DeFi',
      sort: 'name',
      limit: 10,
    });
  });

  it('sorts projects by name or importance', () => {
    expect(parseProjectsQuery({ sort: 'importance' }).sort).toBe('importance');
    expect(() => parseProjectsQuery({ sort: 'stars' })).toThrow(
      InvalidEventQueryError,
    );
  });

  it('rejects an out-of-range limit', () => {
    expect(() => parseProjectsQuery({ limit: '501' })).toThrow(
      InvalidEventQueryError,
    );
  });
});
