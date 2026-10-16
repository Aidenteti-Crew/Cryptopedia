import { Inject, Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import type {
  ContentFeedItem,
  ContentFeedResponse,
  EcosystemHubResponse,
  EventFeedResponse,
  ProjectCategoryCount,
  ProjectItem,
  ProjectsResponse,
} from './chain-feed.types';
import { eventEntryContract } from './event-contract';
import { toEventEntry, type EventRow } from './event-mapper';
import { encodeCursor, type EventQuery } from './event-query';
import type { ContentFeedQuery, ProjectsQuery } from './feed-query';
import { extractUpdateEvidence, releaseIdentity } from './update-evidence';
import { officialReleases, officialCompareUrl } from './official-releases';

interface MacroRow {
  importance_reason: string | null;
  id: string;
  kind: string;
  related_project: string | null;
  title: string;
  summary: string;
  importance: number | null;
  published_at: Date;
  created_at: Date;
  url: string;
  source_name: string;
}

interface TechRow {
  content_raw: string | null;
  importance_reason: string | null;
  id: string;
  kind: string;
  network: string;
  upgrade_name: string | null;
  version: string | null;
  title: string;
  change_summary: string;
  activated_at: Date | null;
  importance: number | null;
  published_at: Date;
  created_at: Date;
  url: string;
  source_name: string;
}

interface GeneralRow {
  importance_reason: string | null;
  id: string;
  title: string;
  summary: string;
  importance: number | null;
  published_at: Date;
  created_at: Date;
  url: string;
  source_name: string;
}

interface ProjectRow {
  importance: number | null;
  importance_reason: string | null;
  id: string;
  external_key: string;
  name: string;
  category: string | null;
  developer: string | null;
  website_url: string | null;
  documentation_url: string | null;
  description: string | null;
  chains: string[] | null;
  source_url: string | null;
}

@Injectable()
export class ChainFeedService {
  private readonly logger = new Logger(ChainFeedService.name);

  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  // Event status is computed here, at request time, never read from a stored value: a cancelled
  // or postponed override wins, otherwise the instant decides. An event with no end time ends when
  // its local calendar day ends (in its own timezone).
  async listEvents(
    query: EventQuery,
    now: Date = new Date(),
  ): Promise<EventFeedResponse> {
    const descending = query.status === 'PAST';
    const bindings: Knex.RawBinding[] = [query.chain, now, now];
    const where: string[] = [];

    if (query.status) {
      where.push('status = ?');
      bindings.push(query.status);
    }
    if (query.from) {
      where.push('starts_at >= ?');
      bindings.push(query.from);
    }
    if (query.toExclusive) {
      where.push('starts_at < ?');
      bindings.push(query.toExclusive);
    }
    if (query.cursor) {
      where.push(
        `(starts_at, id) ${descending ? '<' : '>'} (?::timestamptz, ?::uuid)`,
      );
      bindings.push(query.cursor.startsAt, query.cursor.id);
    }
    const direction = descending ? 'DESC' : 'ASC';
    bindings.push(query.limit + 1);

    const result = await this.knex.raw<{ rows: (EventRow & { id: string })[] }>(
      `WITH e AS (
         SELECT c.*,
                ((date_trunc('day', c.starts_at AT TIME ZONE c.timezone) + interval '1 day')
                  AT TIME ZONE c.timezone) AS day_end
           FROM content.chain_event c
          WHERE c.revoked_at IS NULL AND c.chain = ?
       ), s AS (
         SELECT e.*,
                CASE
                  WHEN e.status_override IS NOT NULL THEN e.status_override
                  WHEN e.starts_at > ?::timestamptz THEN 'UPCOMING'
                  WHEN COALESCE(e.ends_at, e.day_end) > ?::timestamptz THEN 'ONGOING'
                  ELSE 'PAST'
                END AS status
           FROM e
       )
       SELECT * FROM s
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY starts_at ${direction}, id ${direction}
        LIMIT ?`,
      bindings,
    );

    const rows = result.rows;
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toEventEntry).filter((entry) => {
        const valid = eventEntryContract.safeParse(entry).success;
        // Only the id is logged: event text is crawled content and stays out of the logs.
        if (!valid)
          this.logger.warn(
            `dropped event failing the frontend contract: ${entry.id}`,
          );
        return valid;
      }),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({
              startsAt: last.starts_at.toISOString(),
              id: last.id,
            })
          : null,
      generatedAt: now.toISOString(),
    };
  }

  async listMacro(query: ContentFeedQuery): Promise<ContentFeedResponse> {
    const bindings: Knex.RawBinding[] = [query.chain];
    let importance = '';
    if (query.minImportance !== null) {
      importance = 'AND m.importance >= ?';
      bindings.push(query.minImportance);
    }
    let cursor = '';
    if (query.before) {
      cursor = 'AND (m.published_at, m.id) < (?::timestamptz, ?::uuid)';
      bindings.push(query.before.publishedAt, query.before.id);
    }
    bindings.push(query.limit + 1);
    const order =
      query.sort === 'importance'
        ? 'm.importance DESC NULLS LAST, m.published_at DESC'
        : 'm.published_at DESC, m.id DESC';

    const result = await this.knex.raw<{ rows: MacroRow[] }>(
      `SELECT m.id, m.kind, m.related_project, m.title, m.summary, m.importance,
              m.published_at, m.created_at, a.url, s.name AS source_name,
              c.raw_json->>'importance_reason' AS importance_reason
         FROM content.macro_news m
         JOIN content.article_raw a ON a.id = m.article_raw_id
         JOIN content.source s ON s.id = a.source_id
         LEFT JOIN content.article_classification c ON c.article_raw_id = m.article_raw_id
        WHERE m.revoked_at IS NULL AND m.chain = ? ${importance} ${cursor}
        ORDER BY ${order}
        LIMIT ?`,
      bindings,
    );
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    return {
      nextCursor:
        query.sort === 'latest' && result.rows.length > query.limit && last
          ? Buffer.from(
              JSON.stringify({
                publishedAt: last.published_at.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
      items: rows.map(
        (r): ContentFeedItem => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          kind: 'MACRO',
          subKind: r.kind,
          sourceName: r.source_name,
          sourceUrl: r.url,
          publishedAt: r.published_at.toISOString(),
          collectedAt: r.created_at.toISOString(),
          importance: r.importance,
          importanceReason: r.importance_reason,
          relatedProject: r.related_project,
        }),
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  async listUpdates(query: ContentFeedQuery): Promise<ContentFeedResponse> {
    const bindings: Knex.RawBinding[] = [query.chain];
    let importance = '';
    if (query.minImportance !== null) {
      importance = 'AND t.importance >= ?';
      bindings.push(query.minImportance);
    }
    let cursor = '';
    if (query.before) {
      cursor = 'AND (t.published_at, t.id) < (?::timestamptz, ?::uuid)';
      bindings.push(query.before.publishedAt, query.before.id);
    }
    bindings.push(query.limit + 1);
    const order =
      query.sort === 'importance'
        ? 't.importance DESC NULLS LAST, t.published_at DESC'
        : 't.published_at DESC, t.id DESC';

    const result = await this.knex.raw<{ rows: TechRow[] }>(
      `SELECT t.id, t.kind, t.network, t.upgrade_name, t.version, t.title, t.change_summary,
              t.activated_at, t.importance, t.published_at, t.created_at, a.url, a.content_raw,
              c.raw_json->>'importance_reason' AS importance_reason,
              s.name AS source_name
         FROM content.tech_update t
         JOIN content.article_raw a ON a.id = t.article_raw_id
         JOIN content.source s ON s.id = a.source_id
         LEFT JOIN content.article_classification c ON c.article_raw_id = t.article_raw_id
        WHERE t.revoked_at IS NULL AND t.chain = ? ${importance} ${cursor}
        ORDER BY ${order}
        LIMIT ?`,
      bindings,
    );
    const rows = result.rows.slice(0, query.limit);
    const repos = [
      ...new Set(
        rows
          .map((r) => releaseIdentity(r.url)?.repo)
          .filter((r): r is string => !!r),
      ),
    ];
    const official = new Map(
      await Promise.all(
        repos.map(
          async (repo) => [repo, await officialReleases(repo)] as const,
        ),
      ),
    );
    const last = rows.at(-1);
    return {
      nextCursor:
        query.sort === 'latest' && result.rows.length > query.limit && last
          ? Buffer.from(
              JSON.stringify({
                publishedAt: last.published_at.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
      items: rows.map(
        (r): ContentFeedItem => ({
          id: r.id,
          title: r.title,
          summary: r.change_summary,
          kind: 'UPDATE',
          subKind: r.kind,
          sourceName: r.source_name,
          sourceUrl: r.url,
          publishedAt: r.published_at.toISOString(),
          collectedAt: r.created_at.toISOString(),
          importance: r.importance,
          importanceReason: r.importance_reason,
          network: r.network,
          upgradeName: r.upgrade_name,
          version: r.version,
          activatedAt: r.activated_at ? r.activated_at.toISOString() : null,
          ...(() => {
            const identity = releaseIdentity(r.url);
            const release = identity
              ? official
                  .get(identity.repo)
                  ?.find(
                    (v) => v.tag_name === identity.tag && v.html_url === r.url,
                  )
              : undefined;
            return {
              ...extractUpdateEvidence(
                r.url,
                release?.body ?? r.content_raw ?? '',
              ),
              prerelease: release?.prerelease ?? null,
              compareUrl: release ? officialCompareUrl(release) : null,
              ...(release
                ? {
                    version: release.tag_name,
                    ...(release.published_at
                      ? { publishedAt: release.published_at }
                      : {}),
                  }
                : {}),
            };
          })(),
        }),
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  // Posts the classifier filed as GENERAL: useful but outside the four page categories
  // (explainers, overviews). NOISE never reaches a table, so there is nothing to filter here.
  async listGeneral(query: ContentFeedQuery): Promise<ContentFeedResponse> {
    const bindings: Knex.RawBinding[] = [query.chain];
    let importance = '';
    if (query.minImportance !== null) {
      importance = 'AND g.importance >= ?';
      bindings.push(query.minImportance);
    }
    bindings.push(query.limit);
    const order =
      query.sort === 'importance'
        ? 'g.importance DESC NULLS LAST, g.published_at DESC'
        : 'g.published_at DESC';

    const result = await this.knex.raw<{ rows: GeneralRow[] }>(
      `SELECT g.id, g.title, g.summary, g.importance, g.published_at, g.created_at, a.url,
              c.raw_json->>'importance_reason' AS importance_reason,
              s.name AS source_name
         FROM content.general_post g
         JOIN content.article_raw a ON a.id = g.article_raw_id
         JOIN content.source s ON s.id = a.source_id
         LEFT JOIN content.article_classification c ON c.article_raw_id = g.article_raw_id
        WHERE g.revoked_at IS NULL AND g.chain = ? ${importance}
        ORDER BY ${order}
        LIMIT ?`,
      bindings,
    );
    return {
      items: result.rows.map(
        (r): ContentFeedItem => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          kind: 'ARTICLE',
          subKind: 'GENERAL',
          sourceName: r.source_name,
          sourceUrl: r.url,
          publishedAt: r.published_at.toISOString(),
          collectedAt: r.created_at.toISOString(),
          importance: r.importance,
          importanceReason: r.importance_reason,
        }),
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  private async projectCategories(chain: string): Promise<{
    categories: ProjectCategoryCount[];
    total: number;
  }> {
    const result = await this.knex.raw<{
      rows: { name: string | null; count: number }[];
    }>(
      `SELECT category AS name, count(*)::int AS count
         FROM content.eco_project
        WHERE revoked_at IS NULL AND chain = ?
        GROUP BY category
        ORDER BY count DESC, category`,
      [chain],
    );
    const categories = result.rows.map((r) => ({
      name: r.name ?? 'Uncategorized',
      count: r.count,
    }));
    return {
      categories,
      total: categories.reduce((sum, c) => sum + c.count, 0),
    };
  }

  async listProjects(query: ProjectsQuery): Promise<ProjectsResponse> {
    const bindings: Knex.RawBinding[] = [query.chain];
    let category = '';
    if (query.category) {
      category = 'AND category = ?';
      bindings.push(query.category);
    }
    let cursor = '';
    if (query.after) {
      cursor = 'AND (name, id) > (?::text, ?::uuid)';
      bindings.push(query.after.name, query.after.id);
    }
    bindings.push(query.limit + 1);

    const [result, summary] = await Promise.all([
      this.knex.raw<{ rows: ProjectRow[] }>(
        `SELECT id, external_key, name, category, developer, website_url, documentation_url,
                description, chains, source_url, importance, importance_reason
           FROM content.eco_project
          WHERE revoked_at IS NULL AND chain = ? ${category} ${cursor}
          ORDER BY ${query.sort === 'importance' ? 'importance DESC NULLS LAST, name, id' : 'name, id'}
          LIMIT ?`,
        bindings,
      ),
      this.projectCategories(query.chain),
    ]);
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    return {
      nextCursor:
        query.sort === 'name' && result.rows.length > query.limit && last
          ? Buffer.from(
              JSON.stringify({ name: last.name, id: last.id }),
            ).toString('base64url')
          : null,
      items: rows.map(
        (r): ProjectItem => ({
          id: r.id,
          key: r.external_key,
          name: r.name,
          category: r.category,
          developer: r.developer,
          websiteUrl: r.website_url,
          documentationUrl: r.documentation_url,
          description: r.description,
          chains: r.chains ?? [],
          sourceUrl: r.source_url,
          importance: r.importance,
          importanceReason: r.importance_reason,
        }),
      ),
      categories: summary.categories,
      total: summary.total,
      generatedAt: new Date().toISOString(),
    };
  }

  // One call for the combined "ecosystem / macro" page: the four categories side by side.
  async getHub(
    chain: string,
    now: Date = new Date(),
  ): Promise<EcosystemHubResponse> {
    const top = {
      chain,
      limit: 5,
      minImportance: null,
      sort: 'latest' as const,
    };
    const [projects, macro, events, updates, general] = await Promise.all([
      this.projectCategories(chain),
      this.listMacro({ ...top, sort: 'importance' }),
      this.listEvents(
        {
          chain,
          status: 'UPCOMING',
          from: null,
          toExclusive: null,
          limit: 5,
          cursor: null,
        },
        now,
      ),
      this.listUpdates(top),
      this.listGeneral(top),
    ]);
    return {
      projects,
      macro: macro.items,
      events: events.items,
      updates: updates.items,
      general: general.items,
      generatedAt: now.toISOString(),
    };
  }
}
