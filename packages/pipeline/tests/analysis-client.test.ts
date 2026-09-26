import { describe, expect, it, vi } from 'vitest'

import { CrawlerAnalysisClient } from '../src/crawler/analysis-client.js'

describe('CrawlerAnalysisClient', () => {
  it('fails closed when the service token is missing', async () => {
    const fetchFn = vi.fn()
    const client = new CrawlerAnalysisClient('http://crawler.test', fetchFn, '')
    await expect(
      client.analyze({
        sourceId: 'source-1',
        sourceName: 'Builder Hub',
        url: 'https://build.avax.network/blog',
      })
    ).rejects.toThrow('CRAWLER_ANALYSIS_API_TOKEN must contain at least 32 characters')
    expect(fetchFn).not.toHaveBeenCalled()
  })

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
    const result = await new CrawlerAnalysisClient(
      'http://crawler.test',
      fetchFn,
      'service-token-with-at-least-32-chars'
    ).analyze({
      sourceId: 'source-1',
      sourceName: 'Builder Hub',
      url: 'https://build.avax.network/blog',
    })
    expect(result.analysisId).toBe('analysis-1')
    expect(result.spec.detail?.body).toBe('main article')
    expect(result.spec).not.toHaveProperty('jsCode')
    expect(fetchFn).toHaveBeenCalledWith(
      'http://crawler.test/crawler/analyze',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer service-token-with-at-least-32-chars',
        }),
      })
    )
  })
})
