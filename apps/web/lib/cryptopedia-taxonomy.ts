export type ScreenId =
  | "chains"
  | "ecosystem"
  | "projects"
  | "macro"
  | "events"
  | "updates"
  | "fundamentals"
  | "builders"
  | "academy"
  | "event-archive"
  | "builder-test"
  | "article"
  | "book"

export interface NavChild {
  id: string
  label: string
}

export interface NavItem {
  id: ScreenId
  label: string
  children?: NavChild[]
}

/* 사이드바·브레드크럼의 두 섹션.
   LIVE  = 크롤링 자동화로 계속 갱신되는 생태계 자료
   LEARN = 공식 문서 기반으로 정리된 지식 — 핵심 개념을 사람은 아카데미(학습 지도)로, 에이전트는 에이전트 스킬로 받는다 */
export const NAV_SECTION_LABELS = {
  live: "LIVE",
  learn: "LEARN",
} as const

export const ECOSYSTEM_HOME_NAV = {
  label: "생태계 홈",
} as const

export const DEFAULT_SCREEN_ID: ScreenId = "ecosystem"

export const PRIMARY_NAV: NavItem[] = [
  { id: "projects", label: "체인·프로젝트" },
  { id: "macro", label: "매크로 소식" },
  { id: "events", label: "행사·이벤트" },
  { id: "updates", label: "개발 업데이트" },
]

/* 순서가 아니라 목적별 입구라 번호를 붙이지 않는다.
   아카데미는 나머지 둘을 아우르는 학습 경로라 맨 위에 둔다. */
export const CHAPTER_NAV: NavItem[] = [
  {
    id: "academy",
    label: "아카데미",
    children: [
      { id: "skill-graph", label: "학습 지도" },
      { id: "practice", label: "케이스별 실습" },
    ],
  },
  {
    id: "fundamentals",
    label: "핵심 개념",
    children: [
      { id: "chain-overview", label: "체인 개요" },
      { id: "pcx-chains", label: "네트워크·체인 구조" },
      { id: "validator-structure", label: "합의·밸리데이터" },
      { id: "glossary", label: "핵심 용어 사전" },
      { id: "official-docs", label: "공식 문서" },
    ],
  },
  {
    id: "builders",
    label: "에이전트 스킬",
    children: [
      { id: "skill-library", label: "스킬 라이브러리" },
      { id: "mcp-tools", label: "MCP·에이전트 도구" },
      { id: "code-reference", label: "코드·도구 레퍼런스" },
    ],
  },
]

const ARTICLE_PARENT: Record<string, ScreenId> = {
  "chain-overview": "fundamentals",
  "pcx-chains": "fundamentals",
  "validator-structure": "fundamentals",
  glossary: "fundamentals",
  "official-docs": "fundamentals",
  "code-reference": "builders",
  "mcp-x402": "builders",
  "mcp-tools": "builders",
  "skill-library": "builders",
  foundation: "academy",
  structure: "academy",
  practice: "academy",
  "skill-graph": "academy",
  "institutional-collaboration": "macro",
  "ecosystem-expansion": "macro",
  "fuji-update": "updates",
  "developer-tools-release": "updates",
}

/* hub.json 에서 kind 가 CODE·TOOL 인 자료 — id 만으로 부모 화면을 정해야 해서 목록으로 둔다 */
const CODE_RESOURCES = new Set([
  "resource-foundry",
  "resource-viem",
  "resource-mcp",
  "resource-validator-manager",
])

export function resolveParentScreen(entryId: string): ScreenId | null {
  if (entryId.startsWith("project-")) return "projects"
  if (entryId.startsWith("change-")) return "updates"
  if (entryId.startsWith("skill-") && entryId !== "skill-graph") return "builders"
  // 공식 문서·강의는 핵심 개념의 출처, 코드·도구 자료만 에이전트 스킬 쪽에 둔다
  if (entryId.startsWith("resource-")) return CODE_RESOURCES.has(entryId) ? "builders" : "fundamentals"
  if (entryId.startsWith("concept-")) return "fundamentals"
  if (entryId.startsWith("case-")) return "academy"
  return ARTICLE_PARENT[entryId] ?? null
}
