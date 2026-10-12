import { describe, expect, it, vi } from 'vitest'

import type { SourceConfig } from '../src/config/source-config.js'
import { runPipeline } from '../src/jobs/run-pipeline.js'
import { FakeContentDb } from './support/fake-content-db.js'

function source(overrides: Partial<SourceConfig>): SourceConfig {
  return {
    url: 'https://example.com/feed.atom',
    sourceName: 'Example',
    sourceType: 'RSS',
    adapter: 'ATOM',
    contentKind: 'RELEASE',
    authority: 'OFFICIAL',
    enabled: true,
    consecutiveFailuresThreshold: 3,
    ...overrides,
  }
}

describe('runPipeline', () => {
  it('dispatches enabled sources to the matching runner by adapter', async () => {
    const db = new FakeContentDb()
    const atomRunner = vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sourceId: 's1',
      inserted: 1,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    const acpRunner = vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sourceId: 's2',
      inserted: 2,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    const atomSource = source({ sourceName: 'Atom Source', adapter: 'ATOM' })
    const acpSource = source({ sourceName: 'ACP Source', adapter: 'GITHUB_API' })

    const summaries = await runPipeline(db.query, [atomSource, acpSource], {
      runAtomSource: atomRunner,
      runAcpSource: acpRunner,
    })

    expect(atomRunner).toHaveBeenCalledWith(db.query, atomSource)
    expect(acpRunner).toHaveBeenCalledWith(db.query, acpSource)
    expect(summaries).toEqual([
      { sourceName: 'Atom Source', adapter: 'ATOM', status: 'SUCCESS', detail: expect.any(Object) },
      {
        sourceName: 'ACP Source',
        adapter: 'GITHUB_API',
        status: 'SUCCESS',
        detail: expect.any(Object),
      },
    ])
  })

  it('skips disabled sources without calling any runner', async () => {
    const db = new FakeContentDb()
    const atomRunner = vi.fn()
    const summaries = await runPipeline(db.query, [source({ enabled: false })], {
      runAtomSource: atomRunner,
    })

    expect(atomRunner).not.toHaveBeenCalled()
    expect(summaries).toEqual([{ sourceName: 'Example', adapter: 'ATOM', status: 'SKIPPED' }])
  })

  it('skips adapters that have no wired runner yet instead of throwing', async () => {
    const db = new FakeContentDb()
    const summaries = await runPipeline(db.query, [
      source({ sourceName: 'Builder Hub', adapter: 'CRAWL4AI' }),
      source({ sourceName: 'Forum', adapter: 'DISCOURSE_API' }),
    ])

    expect(summaries).toEqual([
      {
        sourceName: 'Builder Hub',
        adapter: 'CRAWL4AI',
        status: 'SKIPPED',
        error: expect.stringContaining('CRAWL4AI'),
      },
      {
        sourceName: 'Forum',
        adapter: 'DISCOURSE_API',
        status: 'SKIPPED',
        error: expect.stringContaining('DISCOURSE_API'),
      },
    ])
  })

  it('dispatches GITHUB_MARKDOWN sources to the markdown runner', async () => {
    const db = new FakeContentDb()
    const markdownRunner = vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sourceId: 's4',
      inserted: 3,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    const blogSource = source({ sourceName: 'Blog', adapter: 'GITHUB_MARKDOWN' })

    const summaries = await runPipeline(db.query, [blogSource], {
      runGithubMarkdownSource: markdownRunner,
    })

    expect(markdownRunner).toHaveBeenCalledWith(db.query, blogSource)
    expect(summaries[0]).toMatchObject({ adapter: 'GITHUB_MARKDOWN', status: 'SUCCESS' })
  })

  it('dispatches APIFY sources to the apify runner', async () => {
    const db = new FakeContentDb()
    const apifyRunner = vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sourceId: 's5',
      inserted: 2,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    const xSource = source({ sourceName: 'X via Apify', adapter: 'APIFY' })

    const summaries = await runPipeline(db.query, [xSource], { runApifySource: apifyRunner })

    expect(apifyRunner).toHaveBeenCalledWith(db.query, xSource)
    expect(summaries[0]).toMatchObject({ adapter: 'APIFY', status: 'SUCCESS' })
  })

  it('dispatches X_API sources to the X runner', async () => {
    const db = new FakeContentDb()
    const xRunner = vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sourceId: 's3',
      inserted: 1,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    const xSource = source({ sourceName: 'X Source', adapter: 'X_API' })

    const summaries = await runPipeline(db.query, [xSource], { runXSource: xRunner })

    expect(xRunner).toHaveBeenCalledWith(db.query, xSource)
    expect(summaries).toEqual([
      { sourceName: 'X Source', adapter: 'X_API', status: 'SUCCESS', detail: expect.any(Object) },
    ])
  })

  it('records a failure for one source and still runs the rest', async () => {
    const db = new FakeContentDb()
    const failingAtomRunner = vi.fn().mockRejectedValue(new Error('feed unreachable'))
    const acpRunner = vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sourceId: 's2',
      inserted: 0,
      skippedDuplicate: 0,
      skippedInvalid: 0,
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const summaries = await runPipeline(
      db.query,
      [
        source({ sourceName: 'Broken Feed', adapter: 'ATOM' }),
        source({ sourceName: 'ACP', adapter: 'GITHUB_API' }),
      ],
      { runAtomSource: failingAtomRunner, runAcpSource: acpRunner }
    )

    consoleError.mockRestore()
    expect(summaries[0]).toEqual({
      sourceName: 'Broken Feed',
      adapter: 'ATOM',
      status: 'FAILED',
      error: 'feed unreachable',
    })
    expect(summaries[1]?.status).toBe('SUCCESS')
    expect(acpRunner).toHaveBeenCalled()
  })
})
