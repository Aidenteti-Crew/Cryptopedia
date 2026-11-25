import { describe, expect, it, vi } from 'vitest'

import type { SourceConfig } from '../src/config/source-config.js'
import { runPipeline } from '../src/jobs/run-pipeline.js'
import { isDue } from '../src/jobs/schedule.js'
import { FakeContentDb } from './support/fake-content-db.js'

const NOW = new Date('2026-11-09T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000)

describe('isDue', () => {
  it('is due when never read, or once the interval has passed', () => {
    expect(isDue(null, 23, NOW)).toBe(true)
    expect(isDue(hoursAgo(23), 23, NOW)).toBe(true)
    expect(isDue(hoursAgo(22.9), 23, NOW)).toBe(false)
  })
})

describe('runPipeline with min_interval_hours', () => {
  const board = (overrides: Partial<SourceConfig>): SourceConfig => ({
    url: 'https://www.kisa.or.kr/401',
    chain: 'web3-kr',
    sourceName: 'KISA 공지사항',
    sourceType: 'WEBSITE',
    adapter: 'HTML_BOARD',
    contentKind: 'NOTICE',
    authority: 'OFFICIAL',
    enabled: true,
    consecutiveFailuresThreshold: 3,
    minIntervalHours: 23,
    ...overrides,
  })
  const result = { status: 'SUCCESS', sourceId: 's', inserted: 0, skippedDuplicate: 0, skippedInvalid: 0, rejected: { noKeyword: 0, excluded: 0, sampleTitles: [] } }

  it('skips a source read within its interval and reads one that is due', async () => {
    const runHtmlBoardSource = vi.fn().mockResolvedValue(result)
    const lastSuccessAt = vi.fn(async (url: string) => (url.endsWith('/401') ? hoursAgo(6) : hoursAgo(30)))

    const summaries = await runPipeline(
      new FakeContentDb().query,
      [board({}), board({ url: 'https://blockchain.kisa.or.kr/bbso/bbsoAnalsList.do', sourceName: '포털' })],
      { runHtmlBoardSource, lastSuccessAt, now: NOW }
    )

    expect(summaries.map((s) => [s.sourceName, s.status])).toEqual([
      ['KISA 공지사항', 'SKIPPED'],
      ['포털', 'SUCCESS'],
    ])
    expect(summaries[0]?.error).toMatch(/^not due: read 2026-11-09T06:00:00.000Z, every 23h$/)
    expect(runHtmlBoardSource).toHaveBeenCalledTimes(1)
  })

  it('does not look up the last read for sources without an interval', async () => {
    const lastSuccessAt = vi.fn()
    const runHtmlBoardSource = vi.fn().mockResolvedValue(result)
    await runPipeline(new FakeContentDb().query, [board({ minIntervalHours: undefined })], {
      runHtmlBoardSource,
      lastSuccessAt,
      now: NOW,
    })
    expect(lastSuccessAt).not.toHaveBeenCalled()
    expect(runHtmlBoardSource).toHaveBeenCalledTimes(1)
  })
})
