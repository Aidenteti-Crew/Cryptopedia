import { InvalidEventQueryError } from './event-query';
import { parseContentFeedQuery, parseProjectsQuery } from './feed-query';

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
