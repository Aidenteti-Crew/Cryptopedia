import type { SourceAdapter, SourceConfig } from '../config/source-config.js'
import type { QueryFn } from '../db/query.js'
import { runAcpSource, type RunAcpSourceResult } from './run-acp-source.js'
import { runAtomSource, type RunAtomSourceResult } from './run-atom-source.js'

export type PipelineSourceStatus = 'SUCCESS' | 'NOT_MODIFIED' | 'SKIPPED' | 'FAILED'

export interface PipelineSourceSummary {
  sourceName: string
  adapter: SourceAdapter
  status: PipelineSourceStatus
  detail?: RunAtomSourceResult | RunAcpSourceResult
  error?: string
}

export interface RunPipelineDeps {
  runAtomSource?: typeof runAtomSource
  runAcpSource?: typeof runAcpSource
}

// Adapters with a wired runner in this switch. Adapters listed in SOURCE_ADAPTERS but not here
// (CRAWL4AI, X_API, DISCOURSE_API, BROWSER_USE, plain RSS) are reported as SKIPPED rather than
// throwing, so adding a source config ahead of its runner's implementation doesn't break the run.
export async function runPipeline(
  query: QueryFn,
  sources: SourceConfig[],
  deps: RunPipelineDeps = {}
): Promise<PipelineSourceSummary[]> {
  const atomRunner = deps.runAtomSource ?? runAtomSource
  const acpRunner = deps.runAcpSource ?? runAcpSource
  const summaries: PipelineSourceSummary[] = []

  for (const source of sources) {
    if (!source.enabled) {
      summaries.push({ sourceName: source.sourceName, adapter: source.adapter, status: 'SKIPPED' })
      continue
    }

    try {
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
        case 'CRAWL4AI':
        case 'X_API':
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
