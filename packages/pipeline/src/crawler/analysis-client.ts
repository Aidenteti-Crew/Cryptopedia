import { ExtractionSpecSchema, type ExtractionSpec } from './extraction-spec.js'

interface AnalysisResponse {
  analysis_id: string
  analysis_json: {
    content_selector: string
    title_selector: string
    date_selector?: string
    author_selector?: string
    url_selector: string
    body_selector?: string
    body_on_detail?: boolean
    detail_body_selector?: string
    pagination_type: 'none' | 'click' | 'scroll'
    wait_for?: string | null
    magic_mode?: boolean
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export class CrawlerAnalysisClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiToken: string | undefined = process.env.CRAWLER_ANALYSIS_API_TOKEN
  ) {}

  async analyze(input: {
    sourceId: string
    sourceName: string
    url: string
    force?: boolean
  }): Promise<{ analysisId: string; spec: ExtractionSpec }> {
    if (!this.apiToken || this.apiToken.length < 32) {
      throw new Error('CRAWLER_ANALYSIS_API_TOKEN must contain at least 32 characters')
    }
    const response = await this.fetchFn(`${this.baseUrl.replace(/\/$/, '')}/crawler/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        source_id: input.sourceId,
        url: input.url,
        force: input.force ?? false,
      }),
      signal: AbortSignal.timeout(305_000),
    })
    if (!response.ok) {
      throw new Error(`Crawler analysis failed: ${response.status} ${await response.text()}`)
    }
    const result = (await response.json()) as AnalysisResponse
    const analysis = result.analysis_json
    const spec = ExtractionSpecSchema.parse({
      version: 1,
      sourceName: input.sourceName,
      listingUrl: input.url,
      selectors: {
        item: analysis.content_selector,
        title: analysis.title_selector,
        url: analysis.url_selector,
        date: analysis.date_selector || undefined,
        author: analysis.author_selector || undefined,
        summary: analysis.body_selector || undefined,
      },
      detail:
        analysis.body_on_detail && analysis.detail_body_selector
          ? { body: analysis.detail_body_selector }
          : undefined,
      pagination: analysis.pagination_type,
      runtime: {
        waitFor: analysis.wait_for ?? undefined,
        magicMode: analysis.magic_mode ?? false,
      },
    })
    return { analysisId: result.analysis_id, spec }
  }
}
