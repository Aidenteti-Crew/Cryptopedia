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

export const DEFAULT_SCREEN_ID: ScreenId = "ecosystem"

export const PRIMARY_NAV: NavItem[] = [
  { id: "projects", label: "체인·프로젝트" },
  { id: "macro", label: "매크로 소식" },
  { id: "events", label: "행사·이벤트" },
  { id: "updates", label: "개발 업데이트" },
]

export const CHAPTER_NAV: NavItem[] = [
  {
    id: "fundamentals",
    label: "01    체인 기초",
    children: [
      { id: "chain-overview", label: "체인 개요" },
      { id: "pcx-chains", label: "네트워크·체인 구조" },
      { id: "validator-structure", label: "합의·밸리데이터" },
      { id: "glossary", label: "핵심 용어 사전" },
    ],
  },
  {
    id: "builders",
    label: "02    빌더 라이브러리",
    children: [
      { id: "official-docs", label: "공식 문서" },
      { id: "code-reference", label: "코드·도구 레퍼런스" },
      { id: "builder-articles", label: "빌더 아티클" },
      { id: "mcp-tools", label: "MCP·에이전트 도구" },
      { id: "skill-library", label: "스킬 라이브러리" },
    ],
  },
  {
    id: "academy",
    label: "03    아카데미",
    children: [
      { id: "foundation", label: "입문" },
      { id: "structure", label: "구조 이해" },
      { id: "practice", label: "케이스별 실습" },
      { id: "skill-graph", label: "학습·스킬 그래프" },
    ],
  },
]

const ARTICLE_PARENT: Record<string, ScreenId> = {
  "chain-overview": "fundamentals",
  "pcx-chains": "fundamentals",
  "validator-structure": "fundamentals",
  glossary: "fundamentals",
  "official-docs": "builders",
  "code-reference": "builders",
  "builder-articles": "builders",
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

export function resolveParentScreen(entryId: string): ScreenId | null {
  if (entryId.startsWith("project-")) return "projects"
  if (entryId.startsWith("change-")) return "updates"
  if (entryId.startsWith("skill-") && entryId !== "skill-graph") return "builders"
  if (entryId.startsWith("resource-")) return "builders"
  if (entryId.startsWith("concept-")) return "fundamentals"
  if (entryId.startsWith("case-")) return "academy"
  return ARTICLE_PARENT[entryId] ?? null
}
