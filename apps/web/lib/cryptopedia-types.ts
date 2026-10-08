import { z } from "zod"

const isoDateTimeSchema = z.string().datetime({ offset: true })

export const contentKindSchema = z.enum([
  "OVERVIEW",
  "ARCHITECTURE",
  "NETWORK",
  "GLOSSARY",
  "DOCS",
  "CODE",
  "ARTICLE",
  "PROTOCOL",
  "FOUNDATION",
  "STRUCTURE",
  "PRACTICE",
  "LEARNING_MAP",
  "MACRO",
  "UPDATE",
  "PROJECT",
  "EVENT",
  "DEV",
])

export const contentEntrySchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive().optional(),
  title: z.string().min(1),
  summary: z.string(),
  kind: contentKindSchema,
  sourceName: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  publishedAt: isoDateTimeSchema.optional(),
  collectedAt: isoDateTimeSchema.optional(),
})

export const collectionPageSchema = z.object({
  id: z.string().min(1),
  breadcrumb: z.array(z.string().min(1)).min(1),
  volume: z.number().int().positive(),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  introduction: z.array(z.string().min(1)).min(1),
  sectionTitle: z.string().min(1),
  entries: z.array(contentEntrySchema),
})

export const chainCollectionItemSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  name: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["AVAILABLE", "COMING_SOON"]),
})

export const chainCollectionPageSchema = z.object({
  breadcrumb: z.array(z.string().min(1)).min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  currentChainId: z.string().min(1),
  items: z.array(chainCollectionItemSchema).min(1),
})

export const ecosystemEntrySchema = z.object({
  id: z.enum(["projects", "macro", "events", "updates"]),
  label: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
})

export const ecosystemPageSchema = z.object({
  breadcrumb: z.array(z.string().min(1)).min(1),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  introduction: z.array(z.string().min(1)).min(1),
  entries: z.array(ecosystemEntrySchema).length(4),
  latest: z.array(contentEntrySchema),
})

export const eventStatusSchema = z.enum([
  "UPCOMING",
  "ONGOING",
  "PAST",
  "CANCELLED",
  "POSTPONED",
])

export const eventEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullable(),
  timezone: z.string().min(1),
  allDay: z.boolean(),
  status: eventStatusSchema,
  organizer: z.string().min(1).nullable(),
  venueName: z.string().min(1).nullable(),
  venueAddress: z.string().min(1).nullable(),
  city: z.string().min(1).nullable(),
  country: z.string().min(1).nullable(),
  isOnline: z.boolean(),
  sourceUrl: z.string().url().nullable(),
  registrationUrl: z.string().url().nullable(),
  imageUrl: z.string().url().nullable(),
  category: z.string().min(1).nullable(),
  tags: z.array(z.string().min(1)),
  chain: z.string().min(1).nullable(),
  project: z.string().min(1).nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
  fetchedAt: isoDateTimeSchema,
  confidence: z.number().min(0).max(1).nullable(),
})

export const eventFeedResponseSchema = z.object({
  items: z.array(eventEntrySchema),
  nextCursor: z.string().min(1).nullable(),
  generatedAt: isoDateTimeSchema,
})

export const collectionVolumeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["CHAIN", "PROJECT"]),
  volume: z.number().int().positive(),
  networkType: z.string().min(1).optional(),
  description: z.string(),
  coverAsset: z.string().min(1).optional(),
  href: z.string().min(1),
})

export const articleSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  body: z.string(),
})

export const articleVariantSchema = z.enum([
  "reader",
  "architecture",
  "validator",
  "glossary",
  "docs",
  "code",
  "protocol",
  "course",
  "lesson",
  "graph",
  "article",
  "macro",
])

export const codeSampleSchema = z.object({
  label: z.string().min(1),
  code: z.string().min(1),
})

export const articleDetailSchema = z.object({
  id: z.string().min(1),
  variant: articleVariantSchema.default("reader"),
  breadcrumb: z.array(z.string().min(1)).min(1),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  quickSummary: z.string().optional(),
  sections: z.array(articleSectionSchema),
  relatedItems: z.array(contentEntrySchema),
  officialUrl: z.string().url().optional(),
  nextItemId: z.string().min(1).optional(),
  codeSample: codeSampleSchema.optional(),
  learningSteps: z.array(contentEntrySchema).default([]),
  sourceInfo: z.array(z.string().min(1)).default([]),
  actionLabel: z.string().min(1).optional(),
  prototypeNote: z.string().min(1).optional(),
})

export const bookDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["CHAIN", "PROJECT"]),
  volume: z.number().int().positive(),
  networkType: z.string().min(1).optional(),
  description: z.string(),
  readingGuide: z.string(),
  contentStatus: z.string(),
  coverAsset: z.string().min(1).optional(),
  chapters: z.array(contentEntrySchema),
})

export type ContentKind = z.infer<typeof contentKindSchema>
export type ContentEntry = z.infer<typeof contentEntrySchema>
export type CollectionPageData = z.infer<typeof collectionPageSchema>
export type ChainCollectionItem = z.infer<typeof chainCollectionItemSchema>
export type ChainCollectionPageData = z.infer<typeof chainCollectionPageSchema>
export type EcosystemEntry = z.infer<typeof ecosystemEntrySchema>
export type EcosystemPageData = z.infer<typeof ecosystemPageSchema>
export type EventStatus = z.infer<typeof eventStatusSchema>
export type EventEntry = z.infer<typeof eventEntrySchema>
export type EventFeedResponse = z.infer<typeof eventFeedResponseSchema>
export type CollectionVolume = z.infer<typeof collectionVolumeSchema>
export type ArticleSection = z.infer<typeof articleSectionSchema>
export type ArticleVariant = z.infer<typeof articleVariantSchema>
export type ArticleDetail = z.input<typeof articleDetailSchema>
export type BookDetail = z.infer<typeof bookDetailSchema>
