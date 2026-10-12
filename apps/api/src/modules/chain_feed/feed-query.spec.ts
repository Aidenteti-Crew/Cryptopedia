import { InvalidEventQueryError } from './event-query';
import { parseContentFeedQuery, parseProjectsQuery } from './feed-query';

describe('parseContentFeedQuery', () => {
  it('defaults to the 30 latest', () => {
    expect(parseContentFeedQuery({})).toEqual({
      limit: 30,
      minImportance: null,
      sort: 'latest',
    });
  });

  it('accepts importance filtering and sorting', () => {
    expect(
      parseContentFeedQuery({
        limit: '5',
        minImportance: '4',
        sort: 'importance',
      }),
    ).toEqual({
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
  ])('rejects %j', (input) => {
    expect(() => parseContentFeedQuery(input)).toThrow(InvalidEventQueryError);
  });
});

describe('parseProjectsQuery', () => {
  it('defaults to all projects and allows a category filter', () => {
    expect(parseProjectsQuery({})).toEqual({ category: null, limit: 500 });
    expect(parseProjectsQuery({ category: 'DeFi', limit: '10' })).toEqual({
      category: 'DeFi',
      limit: 10,
    });
  });

  it('rejects an out-of-range limit', () => {
    expect(() => parseProjectsQuery({ limit: '501' })).toThrow(
      InvalidEventQueryError,
    );
  });
});
