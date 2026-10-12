import { describe, expect, it } from 'vitest'

import { AcpGitHubAdapter } from '../src/adapters/acp-github-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { runAcpSource } from '../src/jobs/run-acp-source.js'
import { FakeContentDb } from './support/fake-content-db.js'

const source: SourceConfig = {
  url: 'https://github.com/avalanche-foundation/ACPs',
  chain: 'avalanche',
  sourceName: 'Avalanche Community Proposals',
  sourceType: 'CUSTOM',
  adapter: 'GITHUB_API',
  contentKind: 'GOVERNANCE',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
}

describe('runAcpSource', () => {
  it('persists the head cursor only after article insertion succeeds', async () => {
    const db = new FakeContentDb()
    const adapter = new AcpGitHubAdapter(async (input: string) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/commits/main')) {
        return new Response(
          JSON.stringify({
            sha: 'head-1',
            commit: { committer: { date: '2026-09-25T00:00:00Z' } },
          })
        )
      }
      if (url.pathname.includes('/git/trees/head-1')) {
        return new Response(
          JSON.stringify({
            truncated: false,
            tree: [{ path: 'ACPs/13-test/README.md', type: 'blob' }],
          })
        )
      }
      return new Response(`| ACP | 13 |
| :--- | :--- |
| **Title** | Test ACP |
| **Author(s)** | Test Author |
| **Status** | Proposed |
| **Track** | Standards |

## Abstract
Test body`)
    })

    const result = await runAcpSource(db.query, source, adapter)
    expect(result.inserted).toBe(1)
    expect(db.articles[0]?.representative_key).toContain('/blob/head-1/ACPs/13-test/README.md')
    expect(db.sources[0]?.source_meta_json?.['cursor']).toMatchObject({ value: 'head-1' })
  })
})
