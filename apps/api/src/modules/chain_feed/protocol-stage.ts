export const LIFECYCLE_STAGES = ['PROPOSED', 'ACCEPTED', 'ACTIVATED', 'STALE'] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export interface ProtocolStageView {
  stage: LifecycleStage;
  // The document still says Proposed while a release already ships it: shown as "확인 중",
  // with both records side by side, instead of picking one.
  needsCheck: boolean;
  evidence: string | null;
  sourceUrl: string | null;
  proposalCreatedAt: string | null;
  proposalUpdatedAt: string | null;
  includedIn: { name: string; url: string } | null;
}

export interface ProtocolStageColumns {
  lifecycle_stage: string | null;
  stage_evidence: string | null;
  stage_source_url: string | null;
  proposal_created_at: Date | null;
  proposal_updated_at: Date | null;
  included_in_release: string | null;
  included_release_url: string | null;
}

export function protocolStageView(row: ProtocolStageColumns): ProtocolStageView | null {
  const stage = LIFECYCLE_STAGES.find((s) => s === row.lifecycle_stage);
  if (!stage) return null;
  const includedIn =
    row.included_in_release && row.included_release_url
      ? { name: row.included_in_release, url: row.included_release_url }
      : null;
  return {
    stage,
    needsCheck: stage === 'PROPOSED' && includedIn !== null,
    evidence: row.stage_evidence,
    sourceUrl: row.stage_source_url,
    proposalCreatedAt: row.proposal_created_at?.toISOString() ?? null,
    proposalUpdatedAt: row.proposal_updated_at?.toISOString() ?? null,
    includedIn,
  };
}
