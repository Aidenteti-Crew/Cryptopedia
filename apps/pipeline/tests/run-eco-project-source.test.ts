import { describe, expect, it } from 'vitest'

import { GithubProjectDirectoryAdapter } from '../src/adapters/github-project-directory-adapter.js'
import type { SourceConfig } from '../src/config/source-config.js'
import { runEcoProjectSource } from '../src/jobs/run-eco-project-source.js'
import { FakeContentDb } from './support/fake-content-db.js'

const source: SourceConfig = {
  url: 'https://build.avax.network/integrations',
  sourceName: 'Avalanche Builder Hub Integrations',
  sourceType: 'WEBSITE',
  adapter: 'GITHUB_DIRECTORY',
  contentKind: 'PROJECT',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  github: { owner: 'o', repo: 'r', branch: 'main', path: 'content/integrations' },
}

function adapterFor(sha: string, files: Record<string, string>, base?: string) {
  return new GithubProjectDirectoryAdapter(async (input: string) => {
    const url = new URL(input)
    if (url.pathname.endsWith('/commits/main')) return new Response(JSON.stringify({ sha }))
    if (url.pathname.includes('/git/trees/')) {
      return new Response(
        JSON.stringify({ tree: Object.keys(files).map((path) => ({ path, type: 'blob' })) })
      )
    }
    if (url.pathname.includes(`/compare/${base}...`)) {
      return new Response(
        JSON.stringify({
          files: Object.keys(files).map((filename) => ({ filename, status: 'modified' })),
        })
      )
    }
    return new Response(files[decodeURIComponent(url.pathname.split('/contents/')[1] ?? '')] ?? '')
  })
}

describe('runEcoProjectSource', () => {
  it('inserts on the first run, updates in place afterwards, and persists the cursor', async () => {
    const db = new FakeContentDb()
    const files = { 'content/integrations/aave.mdx': '---\ntitle: Aave\ncategory: DeFi\n---\n' }

    const first = await runEcoProjectSource(db.query, source, adapterFor('sha-1', files))
    expect(first).toMatchObject({ status: 'SUCCESS', inserted: 1, updated: 0 })

    const renamed = { 'content/integrations/aave.mdx': '---\ntitle: Aave V3\n---\n' }
    const second = await runEcoProjectSource(
      db.query,
      source,
      adapterFor('sha-2', renamed, 'sha-1')
    )
    expect(second).toMatchObject({ inserted: 0, updated: 1 })
    expect(db.ecoProjects).toHaveLength(1)
    expect(db.ecoProjects[0]?.name).toBe('Aave V3')
    expect(db.sources[0]?.source_meta_json?.['cursor']).toMatchObject({ value: 'sha-2' })
  })
})
