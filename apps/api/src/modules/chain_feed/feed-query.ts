import { InvalidEventQueryError, parseChain } from './event-query';

// Shared parsing for the ecosystem list endpoints. Reuses the event error type so the controller
// maps every validation failure to one HTTP 400 shape.
export interface ContentFeedQuery {
  chain: string;
  limit: number;
  minImportance: number | null;
  sort: 'latest' | 'importance';
  before?: { publishedAt: string; id: string };
}

export function parseUpdateQuery(
  raw: Record<string, unknown>,
): ContentFeedQuery {
  const query = parseContentFeedQuery(raw);
  const cursor = single(raw.cursor, 'cursor');
  if (!cursor) return query;
  if (query.sort !== 'latest')
    throw new InvalidEventQueryError('cursor requires latest sort');
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (!decoded || typeof decoded !== 'object') throw new Error();
    const value = decoded as Record<string, unknown>;
    if (
      typeof value.publishedAt !== 'string' ||
      !/^\d{4}-\d\d-\d\dT/.test(value.publishedAt) ||
      !Number.isFinite(Date.parse(value.publishedAt)) ||
      typeof value.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value.id,
      )
    )
      throw new Error();
    query.before = { publishedAt: value.publishedAt, id: value.id };
    return query;
  } catch {
    throw new InvalidEventQueryError('invalid update cursor');
  }
}

export interface ProjectsQuery {
  chain: string;
  category: string | null;
  sort: 'name' | 'importance';
  limit: number;
  after?: { name: string; id: string };
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

function parseProjectSort(value: string | undefined): 'name' | 'importance' {
  if (value === undefined || value === 'name') return 'name';
  if (value === 'importance') return 'importance';
  throw new InvalidEventQueryError('sort must be name or importance');
}

export function parseProjectsQuery(
  raw: Record<string, unknown>,
): ProjectsQuery {
  const query: ProjectsQuery = {
    chain: parseChain(raw),
    category: single(raw.category, 'category') ?? null,
    sort: parseProjectSort(single(raw.sort, 'sort')),
    limit: intInRange(single(raw.limit, 'limit'), 'limit', 1, 500) ?? 500,
  };
  const cursor = single(raw.cursor, 'cursor');
  if (cursor) {
    if (query.sort !== 'name')
      throw new InvalidEventQueryError('project cursor requires name sort');
    try {
      const value = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;
      if (
        !value ||
        typeof value.name !== 'string' ||
        value.name.length > 1000 ||
        typeof value.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value.id,
        )
      )
        throw new Error();
      query.after = { name: value.name, id: value.id };
    } catch {
      throw new InvalidEventQueryError('invalid project cursor');
    }
  }
  return query;
}
