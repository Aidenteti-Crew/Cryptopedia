import { describe, expect, it } from 'vitest'

import { ApifyAdapter } from '../src/adapters/apify-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { runApifySource } from '../src/jobs/run-apify-source.js'
import { FakeContentDb } from './support/fake-content-db.js'

const source: SourceConfig = {
  url: 'https://x.com/Team1KOR',
  chain: 'avalanche',
  sourceName: 'Team1 Korea X',
  sourceType: 'TWITTER',
  adapter: 'APIFY',
  contentKind: 'SOCIAL',
  authority: 'OFFICIAL_COMMUNITY',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  minBodyLength: 40,
  apify: { actor: 'apidojo~tweet-scraper', input: {}, includeRetweets: false },
}

function tweet(id: string, text: string) {
  return {
    id,
    text,
    url: `https://x.com/Team1KOR/status/${id}`,
    createdAt: 'Mon Oct 12 02:31:15 +0000 2026',
    isRetweet: false,
  }
}

describe('runApifySource', () => {
  it('drops posts shorter than min_body_length and stores the rest', async () => {
    const db = new FakeContentDb()
    const adapter = new ApifyAdapter(
      async () =>
        new Response(
          JSON.stringify([
            tweet('3', 't¹ 🔺'),
            tweet('2', '10월 1주 아발란체 소식: 토큰화 미국 국채 규모가 올해 4배 성장했습니다.'),
          ])
        ),
      'https://api.apify.com',
      't'
    )

    const result = await runApifySource(db.query, source, adapter)

    expect(result).toMatchObject({ status: 'SUCCESS', inserted: 1, skippedInvalid: 1 })
    expect(db.articles.map((a) => a.representative_key)).toEqual([
      'https://x.com/Team1KOR/status/2',
    ])
    // The cursor still moves past the dropped post so it is not treated as new again.
    expect(db.sources[0]?.source_meta_json?.['cursor']).toEqual({ value: '3' })
  })
})
