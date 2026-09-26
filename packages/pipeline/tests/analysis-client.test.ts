import { describe, expect, it, vi } from 'vitest'

import { CrawlerAnalysisClient } from '../src/crawler/analysis-client.js'

describe('CrawlerAnalysisClient', () => {
  it('maps browser analysis into a declarative spec and drops executable JS', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            analysis_id: 'analysis-1',
            analysis_json: {
              content_selector: 'article',
              title_selector: 'h2',
              url_selector: 'a',
              date_selector: 'time',
              author_selector: '',
              body_selector: 'p',
              body_on_detail: true,
              detail_body_selector: 'main article',
              pagination_type: 'none',
              wait_for: 'article',
              magic_mode: false,
              js_code: 'window.localStorage.clear()',
            },
          })
        )
    )
    const result = await new CrawlerAnalysisClient('http://crawler.test', fetchFn).analyze({
      sourceId: 'source-1',
      sourceName: 'Builder Hub',
      url: 'https://build.avax.network/blog',
    })
    expect(result.analysisId).toBe('analysis-1')
    expect(result.spec.detail?.body).toBe('main article')
    expect(result.spec).not.toHaveProperty('jsCode')
  })
})
