import { describe, expect, it } from 'vitest'

import type { NormalizedArticle } from '../src/ingestion/contracts.js'
import { buildRepresentativeKey, normalizeUrl } from '../src/ingestion/normalize.js'
import { validateArticle } from '../src/ingestion/validate.js'

const article: NormalizedArticle = {
  sourceUrl: 'https://example.com/feed.atom',
  adapter: 'ATOM',
  contentKind: 'RELEASE',
  authority: 'OFFICIAL',
  guid: 'tag:example.com,2026:release-1',
  title: 'Release 1',
  url: 'https://EXAMPLE.com/releases/1/?utm_source=x#notes',
  normalizedUrl: 'https://example.com/releases/1',
  body: 'Release notes',
  publishedAt: '2026-09-25T00:00:00Z',
}

describe('shared ingestion contract', () => {
  it('normalizes tracking parameters and fragments', () => {
    expect(normalizeUrl(article.url)).toBe('https://example.com/releases/1')
  })

  it('prefers a stable GUID for the representative key', () => {
    expect(buildRepresentativeKey(article)).toBe('tag:example.com,2026:release-1')
  })

  it('falls back to the raw url unprefixed, matching news_collector representative_key format', () => {
    const articleWithoutStableIds: NormalizedArticle = {
      sourceUrl: article.sourceUrl,
      adapter: article.adapter,
      contentKind: article.contentKind,
      authority: article.authority,
      title: article.title,
      url: article.url,
      normalizedUrl: '',
      body: article.body,
      publishedAt: article.publishedAt,
    }
    expect(buildRepresentativeKey(articleWithoutStableIds)).toBe(article.url)
  })

  it('validates recency deterministically', () => {
    expect(
      validateArticle(article, {
        minBodyLength: 5,
        now: new Date('2026-09-26T00:00:00Z'),
        recencyWindowDays: 7,
      })
    ).toEqual([])
  })
})
