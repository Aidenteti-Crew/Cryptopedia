import type { NormalizedArticle } from './contracts.js'

export interface ValidationOptions {
  minBodyLength?: number
  // Titles matching any of these regular expressions are dropped (e.g. internal tags in a feed).
  excludeTitlePatterns?: string[]
  now?: Date
  recencyWindowDays?: number
}

export function validateArticle(
  article: NormalizedArticle,
  options: ValidationOptions = {}
): string[] {
  const errors: string[] = []
  const minBodyLength = options.minBodyLength ?? 0

  if (!article.title.trim()) errors.push('EMPTY_TITLE')
  if (article.body.length < minBodyLength) errors.push('SHORT_CONTENT')
  if (options.excludeTitlePatterns?.some((pattern) => new RegExp(pattern).test(article.title))) {
    errors.push('EXCLUDED_TITLE')
  }

  try {
    const url = new URL(article.url)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') errors.push('INVALID_URL')
  } catch {
    errors.push('INVALID_URL')
  }

  const publishedAt = new Date(article.publishedAt)
  if (Number.isNaN(publishedAt.getTime())) {
    errors.push('INVALID_PUBLISHED_AT')
  } else if (options.recencyWindowDays !== undefined) {
    const now = options.now ?? new Date()
    const cutoff = now.getTime() - options.recencyWindowDays * 86_400_000
    if (publishedAt.getTime() < cutoff) errors.push('STALE_DATE')
  }

  return errors
}
