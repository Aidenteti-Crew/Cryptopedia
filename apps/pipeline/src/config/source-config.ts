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
  'GITHUB_MARKDOWN',
  'GITHUB_DIRECTORY',
  'APIFY',
  'LUMA_ICS',
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
  'PROJECT',
  'EVENT',
] as const

export const SOURCE_AUTHORITIES = ['OFFICIAL', 'OFFICIAL_COMMUNITY', 'THIRD_PARTY'] as const

export type ContentSourceType = (typeof CONTENT_SOURCE_TYPES)[number]
export type SourceAdapter = (typeof SOURCE_ADAPTERS)[number]
export type ContentKind = (typeof CONTENT_KINDS)[number]
export type SourceAuthority = (typeof SOURCE_AUTHORITIES)[number]

export interface GithubMarkdownLocation {
  owner: string
  repo: string
  branch: string
  path: string
}

export interface ApifyLocation {
  actor: string
  input: Record<string, unknown>
  includeRetweets: boolean
}

export interface LumaLocation {
  calendarId: string
}

export interface SourceConfig {
  url: string
  // Which chain's ecosystem the source belongs to (e.g. avalanche). Stored on every derived row.
  chain: string
  sourceName: string
  sourceType: ContentSourceType
  adapter: SourceAdapter
  contentKind: ContentKind
  authority: SourceAuthority
  enabled: boolean
  minBodyLength?: number
  excludeTitlePatterns?: string[]
  recencyWindowDays?: number
  consecutiveFailuresThreshold: number
  github?: GithubMarkdownLocation
  apify?: ApifyLocation
  luma?: LumaLocation
}

const SourceEntrySchema = z
  .object({
    url: z.string().url(),
    // Required with no default: a new chain's source must not silently land as avalanche.
    chain: z.string().regex(/^[a-z0-9_-]{1,50}$/, 'chain must be a lowercase identifier'),
    source_name: z.string().min(1),
    source_type: z.enum(CONTENT_SOURCE_TYPES),
    adapter: z.enum(SOURCE_ADAPTERS),
    content_kind: z.enum(CONTENT_KINDS),
    authority: z.enum(SOURCE_AUTHORITIES),
    enabled: z.boolean().default(true),
    min_body_length: z.number().int().nonnegative().optional(),
    exclude_title_patterns: z
      .array(
        z.string().refine(
          (pattern) => {
            try {
              new RegExp(pattern)
              return true
            } catch {
              return false
            }
          },
          { message: 'must be a valid regular expression' }
        )
      )
      .optional(),
    recency_window_days: z.number().int().positive().optional(),
    consecutive_failures_threshold: z.number().int().positive().default(3),
    github: z
      .object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        branch: z.string().min(1),
        path: z.string().min(1),
      })
      .optional(),
    luma: z.object({ calendar_id: z.string().regex(/^cal-[A-Za-z0-9]+$/) }).optional(),
    apify: z
      .object({
        actor: z.string().min(1),
        input: z.record(z.unknown()).default({}),
        include_retweets: z.boolean().default(false),
      })
      .optional(),
  })
  .superRefine((entry, ctx) => {
    if (
      (entry.adapter === 'GITHUB_MARKDOWN' || entry.adapter === 'GITHUB_DIRECTORY') &&
      !entry.github
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['github'],
        message:
          'github {owner, repo, branch, path} is required for adapters GITHUB_MARKDOWN and GITHUB_DIRECTORY',
      })
    }
    if (entry.adapter === 'LUMA_ICS' && !entry.luma) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['luma'],
        message: 'luma {calendar_id} is required for adapter LUMA_ICS',
      })
    }
    if (entry.adapter === 'APIFY' && !entry.apify) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['apify'],
        message: 'apify {actor, input} is required for adapter APIFY',
      })
    }
  })

const SourcesFileSchema = z.object({
  sources: z.array(SourceEntrySchema),
})

function toSourceConfig(raw: z.infer<typeof SourceEntrySchema>): SourceConfig {
  return {
    url: raw.url,
    chain: raw.chain,
    sourceName: raw.source_name,
    sourceType: raw.source_type,
    adapter: raw.adapter,
    contentKind: raw.content_kind,
    authority: raw.authority,
    enabled: raw.enabled,
    minBodyLength: raw.min_body_length,
    excludeTitlePatterns: raw.exclude_title_patterns,
    recencyWindowDays: raw.recency_window_days,
    consecutiveFailuresThreshold: raw.consecutive_failures_threshold,
    github: raw.github,
    luma: raw.luma && { calendarId: raw.luma.calendar_id },
    apify: raw.apify && {
      actor: raw.apify.actor,
      input: raw.apify.input,
      includeRetweets: raw.apify.include_retweets,
    },
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
