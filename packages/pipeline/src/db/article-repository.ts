import { createHash } from 'node:crypto'

import { v7 as uuidv7 } from 'uuid'

import type { NormalizedArticle } from '../ingestion/contracts.js'
import { buildRepresentativeKey } from '../ingestion/normalize.js'
import type { QueryFn } from './query.js'

export interface InsertArticlesResult {
  inserted: number
  skippedDuplicate: number
}

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest()
}

// content.article_raw.representative_key_hash is a STORED GENERATED column with a plain
// (non-partial) unique index, so ON CONFLICT (representative_key_hash) DO NOTHING is the
// concurrency boundary — not a pre-check SELECT. This is also the boundary that keeps this
// pipeline and python_services/packages/news_collector's agent_comm insert path from ever
// double-storing the same article (see buildRepresentativeKey in ../ingestion/normalize.ts
// for why the key must stay unprefixed).
export async function insertArticles(
  query: QueryFn,
  sourceId: string,
  articles: NormalizedArticle[]
): Promise<InsertArticlesResult> {
  let inserted = 0
  let skippedDuplicate = 0

  for (const article of articles) {
    const representativeKey = buildRepresentativeKey(article)
    const result = await query(
      `INSERT INTO content.article_raw (
         id, source_id, title, url, guid, normalized_url, canonical_url,
         content_hash, published_at, author, content_raw, representative_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (representative_key_hash) DO NOTHING`,
      [
        uuidv7(),
        sourceId,
        article.title,
        article.url,
        article.guid ?? null,
        article.normalizedUrl || null,
        article.canonicalUrl ?? null,
        sha256(article.body),
        article.publishedAt,
        article.author ?? null,
        article.body,
        representativeKey,
      ]
    )
    if (result.rowCount && result.rowCount > 0) {
      inserted++
    } else {
      skippedDuplicate++
    }
  }

  return { inserted, skippedDuplicate }
}
