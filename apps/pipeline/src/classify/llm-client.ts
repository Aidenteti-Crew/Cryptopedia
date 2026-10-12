type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface LlmClient {
  complete(system: string, user: string): Promise<string>
}

export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
}

// Errors that retrying cannot fix (bad key, unknown model). The classify run stops on these
// instead of marking every remaining article as failed.
export class LlmFatalError extends Error {}

export function llmConfigFromEnv(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const apiKey = env.LLM_API_KEY?.trim()
  const model = env.LLM_MODEL?.trim()
  if (!apiKey) throw new Error('LLM_API_KEY is required for classification')
  if (!model) throw new Error('LLM_MODEL is required for classification')
  return {
    baseUrl: (env.LLM_BASE_URL?.trim() || 'https://integrate.api.nvidia.com/v1').replace(
      /\/+$/,
      ''
    ),
    apiKey,
    model,
  }
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null; reasoning_content?: string | null } }[]
}

const REQUEST_TIMEOUT_MS = 180_000
// Reasoning models spend completion tokens on their thinking before the answer.
const MAX_TOKENS = 4000

// Plain OpenAI-compatible chat completions client (NVIDIA build, DeepSeek, OpenAI, ...).
// response_format=json_object is deliberately not used: on NVIDIA's deepseek model it moves the
// answer into reasoning_content and leaves content null, so the prompt asks for JSON instead and
// the caller validates it.
export class OpenAiCompatibleClient implements LlmClient {
  constructor(
    private readonly config: LlmConfig,
    private readonly fetchFn: FetchLike = fetch,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly maxAttempts = 4
  ) {}

  async complete(system: string, user: string): Promise<string> {
    let lastError = 'unknown error'
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      let response: Response
      try {
        response = await this.fetchFn(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0,
            max_tokens: MAX_TOKENS,
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        await this.backoff(attempt)
        continue
      }

      if (response.status === 401 || response.status === 403) {
        throw new LlmFatalError(`LLM authentication failed (${response.status}): check LLM_API_KEY`)
      }
      if (response.status === 404) {
        throw new LlmFatalError(`LLM endpoint or model not found (404): ${this.config.model}`)
      }
      if (response.status === 429 || response.status >= 500) {
        lastError = `LLM request failed: ${response.status}`
        await this.backoff(attempt, response.headers.get('retry-after'))
        continue
      }
      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}`)
      }

      const payload = (await response.json()) as ChatCompletion
      const message = payload.choices?.[0]?.message
      const text = message?.content?.trim() || message?.reasoning_content?.trim()
      if (!text) {
        lastError = 'LLM returned an empty response'
        await this.backoff(attempt)
        continue
      }
      return text
    }
    throw new Error(`LLM request failed after ${this.maxAttempts} attempts: ${lastError}`)
  }

  private async backoff(attempt: number, retryAfter?: string | null): Promise<void> {
    if (attempt >= this.maxAttempts) return
    const seconds = retryAfter ? Number(retryAfter) : NaN
    const waitMs = Number.isFinite(seconds) ? seconds * 1000 : 2000 * 2 ** (attempt - 1)
    await this.sleep(Math.min(waitMs, 30_000))
  }
}
