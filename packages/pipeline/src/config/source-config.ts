import { readFileSync } from 'node:fs'

import { load } from 'js-yaml'
import { z } from 'zod'

export const CONTENT_SOURCE_TYPES = [
  'RSS',
  'TWITTER',
  'LINKEDIN',
  'YOUTUBE',
  'REDDIT',
  'KAKAO',
  'WEBSITE',
  'CUSTOM',
] as const

export const SOURCE_ADAPTERS = [
  'RSS',
  'ATOM',
  'GITHUB_API',
  'DISCOURSE_API',
  'CRAWL4AI',
  'X_API',
  'BROWSER_USE',
] as const

export const CONTENT_KINDS = [
  'BLOG',
  'RELEASE',
  'GOVERNANCE',
  'FORUM',
  'NEWSLETTER',
  'SOCIAL',
  'DOCUMENTATION',
] as const

export const SOURCE_AUTHORITIES = ['OFFICIAL', 'OFFICIAL_COMMUNITY', 'THIRD_PARTY'] as const

export type ContentSourceType = (typeof CONTENT_SOURCE_TYPES)[number]
export type SourceAdapter = (typeof SOURCE_ADAPTERS)[number]
export type ContentKind = (typeof CONTENT_KINDS)[number]
export type SourceAuthority = (typeof SOURCE_AUTHORITIES)[number]

export interface SourceConfig {
  url: string
  sourceName: string
  sourceType: ContentSourceType
  adapter: SourceAdapter
  contentKind: ContentKind
  authority: SourceAuthority
  enabled: boolean
  minBodyLength?: number
  recencyWindowDays?: number
  consecutiveFailuresThreshold: number
}

const SourceEntrySchema = z.object({
  url: z.string().url(),
  source_name: z.string().min(1),
  source_type: z.enum(CONTENT_SOURCE_TYPES),
  adapter: z.enum(SOURCE_ADAPTERS),
  content_kind: z.enum(CONTENT_KINDS),
  authority: z.enum(SOURCE_AUTHORITIES),
  enabled: z.boolean().default(true),
  min_body_length: z.number().int().nonnegative().optional(),
  recency_window_days: z.number().int().positive().optional(),
  consecutive_failures_threshold: z.number().int().positive().default(3),
})

const SourcesFileSchema = z.object({
  sources: z.array(SourceEntrySchema),
})

function toSourceConfig(raw: z.infer<typeof SourceEntrySchema>): SourceConfig {
  return {
    url: raw.url,
    sourceName: raw.source_name,
    sourceType: raw.source_type,
    adapter: raw.adapter,
    contentKind: raw.content_kind,
    authority: raw.authority,
    enabled: raw.enabled,
    minBodyLength: raw.min_body_length,
    recencyWindowDays: raw.recency_window_days,
    consecutiveFailuresThreshold: raw.consecutive_failures_threshold,
  }
}

export function parseSourceConfig(input: string): SourceConfig[] {
  const parsed = SourcesFileSchema.safeParse(load(input))
  if (!parsed.success) {
    throw new Error(`Invalid source config: ${parsed.error.message}`)
  }
  return parsed.data.sources.map(toSourceConfig)
}

export function loadSourceConfig(path: string): SourceConfig[] {
  return parseSourceConfig(readFileSync(path, 'utf8'))
}
