/* 맞춤 학습 경로의 정본 표 — 하는 일(역할) · 해본 것 · 목표.
   id 는 public/cryptopedia/hub.json 의 실제 id 를 쓴다 (tracks.test.ts 가 실재를 확인).
   목표(케이스)가 요구하는 개념은 여기 적지 않고 hub.json 의 케이스 단계에서 읽는다 — route.ts 참고. */

export type LearnerRole = 'newbie' | 'junior' | 'senior' | 'pm' | 'bd' | 'research'
export type ExperienceId =
  | 'wallet'
  | 'defi'
  | 'read-contract'
  | 'deploy'
  | 'rpc'
  | 'node'
  | 'avalanche'

/* 개념 뒤에 붙는 단계 — 케이스 실습 · 에이전트 스킬 · LIVE 화면 */
export type ExtraStep =
  | { kind: 'case'; id: string }
  | { kind: 'skill'; id: string }
  | { kind: 'screen'; id: 'projects' | 'events' | 'updates' }

export interface RoleInfo {
  label: string
  summary: string
}

export const ROLES: Record<LearnerRole, RoleInfo> = {
  newbie: { label: '블록체인 입문자', summary: '지갑도 아직 낯설어요' },
  junior: { label: '주니어 빌더', summary: '개발은 하지만 블록체인은 1~2년 이내' },
  senior: { label: '시니어 빌더', summary: '컨트랙트·인프라를 실무로 다뤄요' },
  pm: { label: '기획·PM', summary: '서비스와 기능을 설계해요' },
  bd: { label: 'BD·마케팅', summary: '파트너와 생태계를 연결해요' },
  research: { label: '리서치·투자', summary: '프로젝트를 분석하고 평가해요' },
}
export const ROLE_IDS = Object.keys(ROLES) as LearnerRole[]

/* 처음부터 쌓기 — 역할마다 목표 개념(선행 개념은 route.ts 가 자동으로 더한다)과 뒤에 붙는 것 */
export interface Track {
  name: string
  concepts: string[]
  extras: ExtraStep[]
}

export const TRACKS: Record<LearnerRole, Track> = {
  newbie: {
    name: '블록체인 기본기',
    concepts: [
      'concept-consensus',
      'concept-validator',
      'concept-evm',
      'concept-wallet',
      'concept-gas',
      'concept-network',
      'concept-c-chain',
    ],
    extras: [
      { kind: 'screen', id: 'projects' },
      { kind: 'case', id: 'case-ecosystem-research' },
    ],
  },
  junior: {
    name: 'EVM 빌더 기본기',
    concepts: [
      'concept-evm',
      'concept-wallet',
      'concept-gas',
      'concept-contract',
      'concept-testing',
      'concept-rpc',
      'concept-network',
      'concept-c-chain',
    ],
    extras: [
      { kind: 'case', id: 'case-first-contract' },
      { kind: 'skill', id: 'skill-contract-review' },
    ],
  },
  senior: {
    name: 'Avalanche 아키텍처',
    concepts: [
      'concept-p-chain',
      'concept-c-chain',
      'concept-x-chain',
      'concept-avalanche-l1',
      'concept-l1-validator',
      'concept-validator-manager',
    ],
    extras: [
      { kind: 'case', id: 'case-primary-network-map' },
      { kind: 'skill', id: 'skill-avalanche-mcp' },
    ],
  },
  pm: {
    name: '기획자를 위한 핵심 구조',
    concepts: [
      'concept-consensus',
      'concept-evm',
      'concept-wallet',
      'concept-gas',
      'concept-contract',
      'concept-avalanche-l1',
    ],
    extras: [{ kind: 'case', id: 'case-ecosystem-research' }],
  },
  bd: {
    name: '생태계 지형 파악',
    concepts: ['concept-c-chain', 'concept-avalanche-l1', 'concept-network'],
    extras: [
      { kind: 'screen', id: 'projects' },
      { kind: 'screen', id: 'events' },
      { kind: 'case', id: 'case-ecosystem-research' },
    ],
  },
  research: {
    name: '구조·검증 분석',
    concepts: [
      'concept-consensus',
      'concept-validator',
      'concept-p-chain',
      'concept-avalanche-l1',
      'concept-l1-validator',
      'concept-validator-manager',
    ],
    extras: [
      { kind: 'screen', id: 'updates' },
      { kind: 'skill', id: 'skill-primary-network-map' },
    ],
  },
}

/* 해본 것 — "얼마나 아세요?" 대신 해본 일로 묻고, 그만큼 개념을 이미 아는 것(known)으로 본다 */
export const EXPERIENCES: Record<ExperienceId, { label: string; known: string[] }> = {
  wallet: { label: '지갑을 만들어 써봤어요', known: ['concept-wallet'] },
  defi: { label: '토큰 전송·스왑·DeFi를 써봤어요', known: ['concept-wallet', 'concept-gas'] },
  'read-contract': {
    label: '컨트랙트 코드를 읽어봤어요',
    known: ['concept-evm', 'concept-contract'],
  },
  deploy: {
    label: '컨트랙트를 직접 배포해봤어요',
    known: [
      'concept-evm',
      'concept-contract',
      'concept-gas',
      'concept-testing',
      'concept-wallet',
      'concept-network',
    ],
  },
  rpc: {
    label: '앱에서 체인 데이터를 조회해봤어요 (RPC·SDK)',
    known: ['concept-evm', 'concept-rpc', 'concept-network'],
  },
  node: {
    label: '노드나 검증자를 운영해봤어요',
    known: ['concept-consensus', 'concept-validator'],
  },
  avalanche: {
    label: 'Avalanche를 써봤어요',
    known: ['concept-primary-network', 'concept-c-chain'],
  },
}
export const EXPERIENCE_IDS = Object.keys(EXPERIENCES) as ExperienceId[]

/* 목표 이루기 — 고를 수 있는 케이스와, 목록에서 '추천'을 붙일 역할 */
export const GOAL_FIT: Record<string, LearnerRole[]> = {
  'case-first-contract': ['junior', 'newbie'],
  'case-chain-reader': ['junior', 'senior'],
  'case-ecosystem-research': ['bd', 'pm', 'research'],
  'case-primary-network-map': ['research', 'senior', 'bd'],
}

export function knownFromExperience(experience: readonly ExperienceId[]): Set<string> {
  return new Set(experience.flatMap((id) => EXPERIENCES[id]?.known ?? []))
}
