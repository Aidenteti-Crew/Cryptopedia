import type { ContentKind, SourceAdapter, SourceAuthority } from '../config/source-config.js'

export interface NormalizedArticle {
  sourceUrl: string
  adapter: SourceAdapter
  contentKind: ContentKind
  authority: SourceAuthority
  externalId?: string
  guid?: string
  title: string
  url: string
  normalizedUrl: string
  canonicalUrl?: string
  body: string
  publishedAt: string
  updatedAt?: string
  author?: string
}

export interface AdapterCursor {
  value?: string
  etag?: string
  lastModified?: string
}

export interface CollectionResult {
  status: 'SUCCESS' | 'NOT_MODIFIED'
  articles: NormalizedArticle[]
  cursor: AdapterCursor
}
