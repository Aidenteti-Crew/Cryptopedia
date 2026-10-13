import type { LlmClient } from './llm-client.js'
import { buildUserMessage, SYSTEM_PROMPT, type PromptArticle } from './prompt.js'
import { classificationSchema, type Classification } from './schema.js'

export interface ClassificationOutcome {
  classification: Classification
  // The validated JSON as the model returned it, kept for audit and re-derivation.
  rawJson: Record<string, unknown>
}

// Models sometimes wrap the object in ```json fences or add a sentence around it, so take the
// outermost {...} instead of requiring the reply to be bare JSON.
export function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('reply contains no JSON object')
  const parsed: unknown = JSON.parse(text.slice(start, end + 1))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('reply JSON is not an object')
  }
  return parsed as Record<string, unknown>
}

function parseReply(text: string): ClassificationOutcome {
  const rawJson = extractJsonObject(text)
  const result = classificationSchema.safeParse(rawJson)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new Error(`reply does not match the schema: ${issues.join('; ')}`)
  }
  return { classification: result.data, rawJson }
}

// One reply that fails validation gets exactly one corrective retry that quotes the problem;
// after that the article is recorded as FAILED rather than looping on a model that cannot comply.
export async function classifyArticle(
  llm: LlmClient,
  article: PromptArticle
): Promise<ClassificationOutcome> {
  const user = buildUserMessage(article)
  const first = await llm.complete(SYSTEM_PROMPT, user)
  try {
    return parseReply(first)
  } catch (firstError) {
    const problem = firstError instanceof Error ? firstError.message : String(firstError)
    const second = await llm.complete(
      SYSTEM_PROMPT,
      `${user}\n\nYour previous reply was rejected: ${problem}. Reply again with ONE valid JSON object that follows the instructions.`
    )
    try {
      return parseReply(second)
    } catch (secondError) {
      const message = secondError instanceof Error ? secondError.message : String(secondError)
      throw new Error(`classification failed twice: ${message}`)
    }
  }
}
