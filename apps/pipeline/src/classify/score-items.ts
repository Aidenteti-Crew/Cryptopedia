import { z } from 'zod'

import { extractJsonObject } from './classify-article.js'
import type { LlmClient } from './llm-client.js'
import { IMPORTANCE_RUBRIC } from './rubric.js'

// Batch importance scoring for rows that never pass through article classification: the project
// directory and calendar events. Only importance (and a one-line reason) comes from the model;
// names, dates and places stay exactly as the source published them.

export type ScoreKind = 'PROJECT' | 'EVENT'

export interface ScoreItem {
  id: string
  // Plain facts shown to the model, one item per entry.
  facts: Record<string, string | string[] | boolean | null>
}

export interface ItemScore {
  importance: number
  reason: string
}

// What is being rated differs; the scale is the shared IMPORTANCE_RUBRIC.
const SUBJECT: Record<ScoreKind, string> = {
  PROJECT:
    'You rate each project listed in the Avalanche ecosystem directory, from the given facts and what you know about it. Judge its relevance to Avalanche, not global fame alone; if you do not know the project, rely on the facts.',
  EVENT:
    'You rate each Avalanche ecosystem event (meetup, workshop, hackathon, conference), using only the given facts. Do not reward an event for being in the past or the future; rate what it is.',
}

function systemPrompt(kind: ScoreKind): string {
  return `${SUBJECT[kind]}
${IMPORTANCE_RUBRIC}
Reply with ONE JSON object and nothing else: {"scores": [{"id": string, "importance": integer 1-5, "reason": importance_reason}]}
Return exactly one entry for every input id, with the id copied unchanged.`
}

const replySchema = z.object({
  scores: z.array(
    z.object({
      id: z.string(),
      importance: z.coerce
        .number()
        .min(1)
        .max(5)
        .transform((n) => Math.round(n)),
      reason: z.string().trim().min(1).max(500),
    })
  ),
})

function parseScores(text: string, ids: Set<string>): Map<string, ItemScore> {
  const parsed = replySchema.safeParse(extractJsonObject(text))
  if (!parsed.success) {
    throw new Error(`score reply does not match the schema: ${parsed.error.issues[0]?.message}`)
  }
  const scores = new Map<string, ItemScore>()
  for (const s of parsed.data.scores) {
    // Ignore ids the model invented; a missing id just stays unscored for the next run.
    if (ids.has(s.id)) scores.set(s.id, { importance: s.importance, reason: s.reason })
  }
  if (scores.size === 0) throw new Error('score reply contains none of the requested ids')
  return scores
}

export function scoreSystemPrompt(kind: ScoreKind): string {
  return systemPrompt(kind)
}

export async function scoreBatch(
  llm: LlmClient,
  kind: ScoreKind,
  items: ScoreItem[]
): Promise<Map<string, ItemScore>> {
  const ids = new Set(items.map((i) => i.id))
  const user = JSON.stringify(items.map((i) => ({ id: i.id, ...i.facts })))
  const first = await llm.complete(systemPrompt(kind), user)
  try {
    return parseScores(first, ids)
  } catch (error) {
    const problem = error instanceof Error ? error.message : String(error)
    const second = await llm.complete(
      systemPrompt(kind),
      `${user}\n\nYour previous reply was rejected: ${problem}. Reply again with ONE valid JSON object.`
    )
    return parseScores(second, ids)
  }
}
