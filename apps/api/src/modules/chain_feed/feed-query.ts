import { InvalidEventQueryError, parseChain } from './event-query';

// Shared parsing for the ecosystem list endpoints. Reuses the event error type so the controller
// maps every validation failure to one HTTP 400 shape.
export interface ContentFeedQuery {
  chain: string;
  limit: number;
  minImportance: number | null;
  sort: 'latest' | 'importance';
}

export interface ProjectsQuery {
  chain: string;
  category: string | null;
  limit: number;
}

function single(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string')
    throw new InvalidEventQueryError(`${name} must be given once`);
  return value;
}

function intInRange(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new InvalidEventQueryError(
      `${name} must be an integer between ${min} and ${max}`,
    );
  }
  return n;
}

export function parseContentFeedQuery(
  raw: Record<string, unknown>,
): ContentFeedQuery {
  const sort = single(raw.sort, 'sort') ?? 'latest';
  if (sort !== 'latest' && sort !== 'importance') {
    throw new InvalidEventQueryError('sort must be latest or importance');
  }
  return {
    chain: parseChain(raw),
    limit: intInRange(single(raw.limit, 'limit'), 'limit', 1, 100) ?? 30,
    minImportance: intInRange(
      single(raw.minImportance, 'minImportance'),
      'minImportance',
      1,
      5,
    ),
    sort,
  };
}

export function parseProjectsQuery(
  raw: Record<string, unknown>,
): ProjectsQuery {
  return {
    chain: parseChain(raw),
    category: single(raw.category, 'category') ?? null,
    limit: intInRange(single(raw.limit, 'limit'), 'limit', 1, 500) ?? 500,
  };
}
