import type { ContentEntry } from './cryptopedia-types'

type ProtocolStage = NonNullable<ContentEntry['protocolStage']>

// 제안 · 확정 · 적용 · 중단. The stage comes from the proposal document (pipeline D1), not the LLM.
const STAGE: Record<ProtocolStage['stage'], { label: string; color: string }> = {
  PROPOSED: { label: '제안', color: 'orange' },
  ACCEPTED: { label: '확정', color: 'blue' },
  ACTIVATED: { label: '적용', color: 'mint' },
  STALE: { label: '중단', color: 'neutral' },
}

export function stageBadge(stage: ProtocolStage): { label: string; color: string } {
  if (stage.needsCheck) return { label: '제안 · 확인 중', color: 'orange' }
  return STAGE[stage.stage]
}

export function stageLabel(stage: ProtocolStage['stage']): string {
  return STAGE[stage].label
}
