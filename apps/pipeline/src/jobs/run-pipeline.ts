import type { SourceAdapter, SourceConfig } from '../config/source-config.js'
import type { QueryFn } from '../db/query.js'
import { getSourceLastSuccess } from '../db/source-repository.js'
import { isDue } from './schedule.js'
import { runAcpSource, type RunAcpSourceResult } from './run-acp-source.js'
import { runApifySource, type RunApifySourceResult } from './run-apify-source.js'
import { runLumaSource, type RunLumaSourceResult } from './run-luma-source.js'
import { runEcoProjectSource, type RunEcoProjectSourceResult } from './run-eco-project-source.js'
import { runAtomSource, type RunAtomSourceResult } from './run-atom-source.js'
import { runHtmlBoardSource, type RunHtmlBoardSourceResult } from './run-html-board-source.js'
import {
  runGithubMarkdownSource,
  type RunGithubMarkdownSourceResult,
} from './run-github-markdown-source.js'
import { runXSource, type RunXSourceResult } from './run-x-source.js'

export type PipelineSourceStatus = 'SUCCESS' | 'NOT_MODIFIED' | 'SKIPPED' | 'FAILED'

export interface PipelineSourceSummary {
  sourceName: string
  adapter: SourceAdapter
  status: PipelineSourceStatus
  detail?:
    | RunAtomSourceResult
    | RunAcpSourceResult
    | RunXSourceResult
    | RunGithubMarkdownSourceResult
    | RunApifySourceResult
    | RunLumaSourceResult
    | RunEcoProjectSourceResult
    | RunHtmlBoardSourceResult
  error?: string
}

export interface RunPipelineDeps {
  runAtomSource?: typeof runAtomSource
  runAcpSource?: typeof runAcpSource
  runXSource?: typeof runXSource
  runGithubMarkdownSource?: typeof runGithubMarkdownSource
  runApifySource?: typeof runApifySource
  runLumaSource?: typeof runLumaSource
  runEcoProjectSource?: typeof runEcoProjectSource
  runHtmlBoardSource?: typeof runHtmlBoardSource
  lastSuccessAt?: (urlHandle: string) => Promise<Date | null>
  now?: Date
}

// Adapters with a wired runner in this switch. Adapters listed in SOURCE_ADAPTERS but not here
// (CRAWL4AI, DISCOURSE_API, BROWSER_USE, plain RSS) are reported as SKIPPED rather than
// throwing, so adding a source config ahead of its runner's implementation doesn't break the run.
export async function runPipeline(
  query: QueryFn,
  sources: SourceConfig[],
  deps: RunPipelineDeps = {}
): Promise<PipelineSourceSummary[]> {
  const atomRunner = deps.runAtomSource ?? runAtomSource
  const acpRunner = deps.runAcpSource ?? runAcpSource
  const xRunner = deps.runXSource ?? runXSource
  const markdownRunner = deps.runGithubMarkdownSource ?? runGithubMarkdownSource
  const apifyRunner = deps.runApifySource ?? runApifySource
  const lumaRunner = deps.runLumaSource ?? runLumaSource
  const ecoProjectRunner = deps.runEcoProjectSource ?? runEcoProjectSource
  const boardRunner = deps.runHtmlBoardSource ?? runHtmlBoardSource
  const lastSuccessAt = deps.lastSuccessAt ?? ((url: string) => getSourceLastSuccess(query, url))
  const now = deps.now ?? new Date()
  const summaries: PipelineSourceSummary[] = []

  for (const source of sources) {
    if (!source.enabled) {
      summaries.push({ sourceName: source.sourceName, adapter: source.adapter, status: 'SKIPPED' })
      continue
    }

    try {
      if (source.minIntervalHours !== undefined) {
        const last = await lastSuccessAt(source.url)
        if (!isDue(last, source.minIntervalHours, now)) {
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: 'SKIPPED',
            error: `not due: read ${last?.toISOString()}, every ${source.minIntervalHours}h`,
          })
          continue
        }
      }
      switch (source.adapter) {
        case 'ATOM': {
          const result = await atomRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'GITHUB_API': {
          const result = await acpRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'GITHUB_MARKDOWN': {
          const result = await markdownRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'GITHUB_DIRECTORY': {
          const result = await ecoProjectRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'LUMA_ICS': {
          const result = await lumaRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'APIFY': {
          const result = await apifyRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'HTML_BOARD': {
          const result = await boardRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'X_API': {
          const result = await xRunner(query, source)
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: result.status,
            detail: result,
          })
          break
        }
        case 'CRAWL4AI':
        case 'DISCOURSE_API':
        case 'BROWSER_USE':
        case 'RSS':
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: 'SKIPPED',
            error: `no runner wired into runPipeline yet for adapter=${source.adapter}`,
          })
          break
        default:
          summaries.push({
            sourceName: source.sourceName,
            adapter: source.adapter,
            status: 'SKIPPED',
            error: `unrecognized adapter: ${String(source.adapter)}`,
          })
      }
    } catch (err) {
      console.error(`[pipeline] source=${source.sourceName} failed:`, err)
      summaries.push({
        sourceName: source.sourceName,
        adapter: source.adapter,
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return summaries
}
