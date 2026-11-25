import { ACP_STATUSES, type AcpStatus } from '../adapters/acp-github-adapter.js'

export const LIFECYCLE_STAGES = ['PROPOSED', 'ACCEPTED', 'ACTIVATED', 'STALE'] as const
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

// 제안 · 확정 · 적용 · 중단. Decided from the proposal document's own status, never by the LLM.
export const STAGE_BY_ACP_STATUS: Record<AcpStatus, LifecycleStage> = {
  Proposed: 'PROPOSED',
  Implementable: 'ACCEPTED',
  Activated: 'ACTIVATED',
  Stale: 'STALE',
}

export interface IncludedRelease {
  name: string
  url: string
}

export interface ProtocolStage {
  stage: LifecycleStage
  evidence: string
  sourceUrl: string
  proposalCreatedAt: string | null
  proposalUpdatedAt: string | null
  includedIn: IncludedRelease | null
}

export interface AcpHeader {
  number: number
  status: AcpStatus
  createdAt: string | null
  updatedAt: string | null
}

function headerLine(body: string, label: string): string | undefined {
  return new RegExp(`^${label}: (.+)$`, 'm').exec(body)?.[1]?.trim()
}

// Reads the header lines AcpGitHubAdapter writes above every ACP document (eventBody). Bodies
// from any other source have no such header and give null.
export function parseAcpHeader(body: string): AcpHeader | null {
  const number = headerLine(body, 'ACP')
  const status = ACP_STATUSES.find((s) => s === headerLine(body, 'Status'))
  if (!number || !/^\d+$/.test(number) || !status) return null
  return {
    number: Number(number),
    status,
    createdAt: headerLine(body, 'Created') ?? null,
    updatedAt: headerLine(body, 'Updated') ?? null,
  }
}

export function protocolStageFromAcp(
  header: AcpHeader,
  documentUrl: string,
  includedIn: IncludedRelease | null
): ProtocolStage {
  return {
    stage: STAGE_BY_ACP_STATUS[header.status],
    evidence: `Status: ${header.status}`,
    sourceUrl: documentUrl,
    proposalCreatedAt: header.createdAt,
    proposalUpdatedAt: header.updatedAt,
    includedIn,
  }
}

// avalanchego notes list the ACPs an upgrade activates as links to their documents
// ("Helicon activates the following ... ACPs: - [ACP-267](…/ACPs/267-uptime-…/README.md)").
// Plain mentions ("ACP-176 gas target" in a metrics line) are not inclusion, so only links count.
export function acpDocumentLinkPattern(acpNumber: number): string {
  return `avalanche-foundation/ACPs/(blob|tree)/[^/"\\s)]+/ACPs/${acpNumber}-`
}

function isStableTag(releaseUrl: string): boolean {
  const tag = releaseUrl.split('/releases/tag/')[1] ?? ''
  return tag !== '' && !tag.includes('-')
}

// The release that first included the proposal: a stable release over its Fuji pre-release
// (tag "v1.15.0" over "v1.15.0-fuji"), then the earliest.
export function pickIncludingRelease(
  candidates: { name: string; url: string; publishedAt: Date }[]
): IncludedRelease | null {
  const sorted = [...candidates].sort(
    (a, b) =>
      Number(isStableTag(b.url)) - Number(isStableTag(a.url)) ||
      a.publishedAt.getTime() - b.publishedAt.getTime()
  )
  const first = sorted[0]
  return first ? { name: first.name, url: first.url } : null
}
