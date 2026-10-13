import { z } from 'zod'

// Shape the model must return for one article. Values the model gets wrong in a recoverable way
// (unknown enum value, malformed date) degrade to a safe default or null instead of failing the
// whole classification, because the rules downstream never accept a guessed date or location.
export const CLASSIFICATION_CATEGORIES = [
  'MACRO',
  'EVENT',
  'TECH_UPDATE',
  'GENERAL',
  'NOISE',
] as const
export const EVENT_CATEGORIES = [
  'COMMUNITY',
  'CONFERENCE',
  'HACKATHON',
  'TRADING_CONTEST',
  'OTHER',
] as const

const optionalText = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
  })

const optionalDateTime = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed && !Number.isNaN(Date.parse(trimmed)) ? trimmed : null
  })

const macroSchema = z.object({
  kind: z.enum(['COLLAB', 'VOLUME', 'OTHER']).catch('OTHER'),
  related_project: optionalText,
})

const techSchema = z.object({
  network: z.enum(['FUJI', 'MAINNET', 'BOTH', 'OTHER']).catch('OTHER'),
  upgrade_name: optionalText,
  version: optionalText,
  activated_at: optionalDateTime,
})

const eventSchema = z.object({
  name: optionalText,
  starts_at: optionalDateTime,
  ends_at: optionalDateTime,
  timezone: optionalText,
  all_day: z.boolean().catch(false),
  organizer: optionalText,
  venue_name: optionalText,
  venue_address: optionalText,
  city: optionalText,
  country: optionalText,
  is_online: z.boolean().catch(false),
  registration_url: optionalText,
  category: z.enum(EVENT_CATEGORIES).catch('OTHER'),
  tags: z.array(z.string()).catch([]),
  status: z.enum(['CANCELLED', 'POSTPONED']).nullable().catch(null),
  confidence: z.coerce.number().min(0).max(1).nullable().catch(null),
})

export const classificationSchema = z.object({
  category: z.enum(CLASSIFICATION_CATEGORIES),
  importance: z.coerce
    .number()
    .min(1)
    .max(5)
    .transform((value) => Math.round(value)),
  title_ko: optionalText,
  summary_ko: z.string().trim().min(1),
  importance_reason: optionalText,
  macro: macroSchema.nullable().optional(),
  tech: techSchema.nullable().optional(),
  event: eventSchema.nullable().optional(),
})

export type Classification = z.infer<typeof classificationSchema>
export type EventExtraction = z.infer<typeof eventSchema>
