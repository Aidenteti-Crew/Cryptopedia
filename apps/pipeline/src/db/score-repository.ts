import type { ScoreItem, ScoreKind, ItemScore } from '../classify/score-items.js'
import type { QueryFn } from './query.js'

// Rows whose importance_scored_at is null have not been scored yet. Rows that already got an
// importance from article classification (LLM-extracted events) are not re-scored.
export async function fetchUnscored(
  query: QueryFn,
  kind: ScoreKind,
  chain: string,
  limit: number
): Promise<ScoreItem[]> {
  if (kind === 'PROJECT') {
    const result = await query(
      `SELECT id, name, category, developer, description, chains
         FROM content.eco_project
        WHERE chain = $1 AND revoked_at IS NULL AND importance_scored_at IS NULL
        ORDER BY name
        LIMIT $2`,
      [chain, limit]
    )
    return result.rows.map((r) => ({
      id: String(r.id),
      facts: {
        name: r.name as string,
        category: (r.category as string | null) ?? null,
        developer: (r.developer as string | null) ?? null,
        description: ((r.description as string | null) ?? '').slice(0, 400) || null,
        chains: (r.chains as string[] | null) ?? [],
      },
    }))
  }
  const result = await query(
    `SELECT id, title, category, starts_at, city, country, venue_name, organizer, summary, is_online
       FROM content.chain_event
      WHERE chain = $1 AND revoked_at IS NULL AND importance IS NULL
        AND importance_scored_at IS NULL
      ORDER BY starts_at DESC
      LIMIT $2`,
    [chain, limit]
  )
  return result.rows.map((r) => ({
    id: String(r.id),
    facts: {
      title: r.title as string,
      category: (r.category as string | null) ?? null,
      date: new Date(r.starts_at as string | Date).toISOString().slice(0, 10),
      place: [r.venue_name, r.city, r.country].filter(Boolean).join(', ') || null,
      online: r.is_online as boolean,
      organizer: (r.organizer as string | null) ?? null,
      hosts: ((r.summary as string | null) ?? '').slice(0, 200) || null,
    },
  }))
}

export async function saveScore(
  query: QueryFn,
  kind: ScoreKind,
  id: string,
  score: ItemScore,
  model: string
): Promise<void> {
  const table = kind === 'PROJECT' ? 'content.eco_project' : 'content.chain_event'
  await query(
    `UPDATE ${table}
        SET importance = $2, importance_reason = $3, importance_model = $4,
            importance_scored_at = now()
      WHERE id = $1`,
    [id, score.importance, score.reason, model]
  )
}
