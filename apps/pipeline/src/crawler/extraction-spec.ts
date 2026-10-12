import { createHash } from 'node:crypto'

import { z } from 'zod'

const SelectorSchema = z.string().trim().min(1).max(500)
const OptionalSelectorSchema = z.string().trim().max(500).optional()

export const ExtractionSpecSchema = z
  .object({
    version: z.literal(1),
    sourceName: z.string().trim().min(1).max(200),
    listingUrl: z
      .string()
      .url()
      .refine((url) => url.startsWith('https://'), 'HTTPS is required'),
    selectors: z.object({
      item: SelectorSchema,
      title: SelectorSchema,
      url: SelectorSchema,
      date: OptionalSelectorSchema,
      author: OptionalSelectorSchema,
      summary: OptionalSelectorSchema,
    }),
    detail: z
      .object({
        body: SelectorSchema,
      })
      .optional(),
    pagination: z.enum(['none', 'click', 'scroll']),
    runtime: z
      .object({
        waitFor: z.string().trim().max(500).optional(),
        magicMode: z.boolean().default(false),
      })
      .default({ magicMode: false }),
  })
  .strict()

export type ExtractionSpec = z.infer<typeof ExtractionSpecSchema>

export function serializeExtractionSpec(input: unknown): string {
  const spec = ExtractionSpecSchema.parse(input)
  return `${JSON.stringify(spec, null, 2)}\n`
}

export function artifactSha256(content: string): Buffer {
  return createHash('sha256').update(content).digest()
}

export function artifactSha256Hex(content: string): string {
  return artifactSha256(content).toString('hex')
}
