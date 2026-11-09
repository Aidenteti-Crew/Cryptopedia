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
  'HTML_BOARD',
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
  // An organization's notice board (public agencies' 공지사항): events, programs and unrelated
  // notices mixed together, so a keyword filter runs before anything is stored.
  'NOTICE',
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

// Where things are on a server-rendered notice board. A selector ending in "@attr" reads that
// attribute instead of the text (e.g. "td.sbj a@href").
export interface BoardLayout {
  listItem: string
  title: string
  link: string
  date: string
  detailBody: string
  pageParam: string
  maxPages: number
  // Query parameters dropped from post links so a post keeps one URL as it moves down the
  // list (KISA appends the list page number to every link).
  dropLinkParams: string[]
  // For boards whose links are script calls (javascript:fn_goView('ID')): the id is the first
  // group of linkIdPattern, put into detailUrl's "{id}" and resolved against the list page.
  linkIdPattern?: string
  detailUrl?: string
  // Board dates have no time; they are read as midnight at this UTC offset.
  utcOffset: string
  encoding: string
  requestDelayMs: number
}

export interface KeywordFilter {
  include: string[]
  exclude: string[]
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
  board?: BoardLayout
  keywords?: KeywordFilter
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
    board: z
      .object({
        list_item: z.string().min(1),
        title: z.string().min(1),
        link: z.string().min(1),
        date: z.string().min(1),
        detail_body: z.string().min(1),
        page_param: z.string().min(1).default('page'),
        max_pages: z.number().int().positive().max(10).default(2),
        drop_link_params: z.array(z.string().min(1)).default([]),
        link_id_pattern: z
          .string()
          .refine(
            (pattern) => {
              try {
                return new RegExp(pattern).source.includes('(')
              } catch {
                return false
              }
            },
            { message: 'must be a valid regular expression with a capture group' }
          )
          .optional(),
        detail_url: z.string().includes('{id}').optional(),
        utc_offset: z
          .string()
          .regex(/^[+-]\d{2}:\d{2}$/)
          .default('+09:00'),
        encoding: z.string().min(1).default('utf-8'),
        // Public agency sites are small; one request every 2 seconds at most.
        request_delay_ms: z.number().int().min(2000).default(2000),
      })
      .optional(),
    include_keywords: z.array(z.string().min(1)).optional(),
    exclude_keywords: z.array(z.string().min(1)).optional(),
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
    if (entry.adapter === 'HTML_BOARD' && !entry.board) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['board'],
        message: 'board {list_item, title, link, date, detail_body} is required for adapter HTML_BOARD',
      })
    }
    if (entry.board && Boolean(entry.board.link_id_pattern) !== Boolean(entry.board.detail_url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['board'],
        message: 'board link_id_pattern and detail_url go together',
      })
    }
    if (entry.adapter === 'HTML_BOARD' && !entry.include_keywords?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['include_keywords'],
        message: 'include_keywords is required for adapter HTML_BOARD (a board mixes unrelated notices)',
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
    board: raw.board && {
      listItem: raw.board.list_item,
      title: raw.board.title,
      link: raw.board.link,
      date: raw.board.date,
      detailBody: raw.board.detail_body,
      pageParam: raw.board.page_param,
      maxPages: raw.board.max_pages,
      dropLinkParams: raw.board.drop_link_params,
      linkIdPattern: raw.board.link_id_pattern,
      detailUrl: raw.board.detail_url,
      utcOffset: raw.board.utc_offset,
      encoding: raw.board.encoding,
      requestDelayMs: raw.board.request_delay_ms,
    },
    keywords: raw.include_keywords && {
      include: raw.include_keywords,
      exclude: raw.exclude_keywords ?? [],
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
