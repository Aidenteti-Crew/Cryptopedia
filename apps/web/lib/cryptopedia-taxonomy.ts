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
      { id: "pcx-chains", label: "P · C · X 체인" },
      { id: "validator-structure", label: "밸리데이터 구조" },
      { id: "glossary", label: "핵심 용어 사전" },
    ],
  },
  {
    id: "builders",
    label: "02    빌더 라이브러리",
    children: [
      { id: "official-docs", label: "공식 Docs" },
      { id: "code-reference", label: "코드 레퍼런스" },
      { id: "builder-articles", label: "빌더 아티클" },
      { id: "mcp-x402", label: "MCP · x402" },
    ],
  },
  {
    id: "academy",
    label: "03    아카데미",
    children: [
      { id: "foundation", label: "입문 — 체인의 첫 개념" },
      { id: "structure", label: "구조 — 네트워크 읽기" },
      { id: "practice", label: "실습 — 첫 프로젝트" },
      { id: "skill-graph", label: "스킬 그래프" },
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
  return ARTICLE_PARENT[entryId] ?? null
}
