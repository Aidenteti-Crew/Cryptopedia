import { ChevronRight } from 'lucide-react'

import {
  CHAPTER_NAV,
  ECOSYSTEM_HOME_NAV,
  NAV_SECTION_LABELS,
  PRIMARY_NAV,
  type ScreenId,
} from '@/lib/cryptopedia-taxonomy'
import { findHubItem, type HubData } from '@/lib/cryptopedia-hub'
import type { EditorialView } from './editorial-app'

export type BreadcrumbTarget = { kind: 'screen'; id: ScreenId } | { kind: 'article'; id: string }

export interface EditorialBreadcrumbItem {
  label: string
  target?: BreadcrumbTarget
}

const SCREEN_LABELS: Record<string, string> = {
  ecosystem: ECOSYSTEM_HOME_NAV.label,
  chains: '컬렉션 선택',
  'event-archive': '행사 아카이브',
  'builder-test': '빌더 유형 테스트',
  ...Object.fromEntries([...PRIMARY_NAV, ...CHAPTER_NAV].map((item) => [item.id, item.label])),
}
const CHILD_LABELS = Object.fromEntries(
  CHAPTER_NAV.flatMap((chapter) => chapter.children ?? []).map((child) => [child.id, child.label])
)
/* 자료 종류 → 그 자료를 모아 보여주는 목록. 아티클은 메뉴에서 빠져 목록 단계를 건너뛴다 */
const RESOURCE_COLLECTION: Partial<Record<HubData['resources'][number]['kind'], string>> = {
  DOCS: 'official-docs',
  COURSE: 'official-docs',
  CODE: 'code-reference',
  TOOL: 'mcp-tools',
}

/* 글이 속한 LEARN 하위 메뉴 항목 — breadcrumb 의 중간 단계와 사이드바의 현재 위치가 같은 규칙을 쓴다.
   메뉴 항목 자체면 그 id, 목록에 속한 글이면 그 목록 id (예: concept-… → 핵심 용어 사전) */
export function menuEntryFor(id: string, hub?: HubData): string | undefined {
  if (id in CHILD_LABELS) return id
  if (id.startsWith('case-')) return 'practice'
  if (id.startsWith('concept-')) return 'glossary'
  if (id.startsWith('skill-')) return 'skill-library'
  if (id.startsWith('resource-')) {
    const resource = hub?.resources.find((item) => item.id === id)
    return resource ? RESOURCE_COLLECTION[resource.kind] : undefined
  }
  return undefined
}

export function getEditorialBreadcrumbs(
  view: EditorialView,
  context: { title?: string; hub?: HubData } = {}
): EditorialBreadcrumbItem[] {
  const section: EditorialBreadcrumbItem = {
    label: CHAPTER_NAV.some(
      (chapter) => chapter.id === (view.kind === 'screen' ? view.id : view.parent)
    )
      ? NAV_SECTION_LABELS.learn
      : NAV_SECTION_LABELS.live,
  }
  const screen = view.kind === 'screen' ? view.id : view.parent
  const ancestors: EditorialBreadcrumbItem[] = [section]
  if (section.label === NAV_SECTION_LABELS.live && screen !== 'ecosystem') {
    ancestors.push({ label: '생태계 홈', target: { kind: 'screen', id: 'ecosystem' } })
  }
  if (view.kind === 'screen') {
    if (view.id === 'event-archive') {
      ancestors.push({ label: SCREEN_LABELS.events, target: { kind: 'screen', id: 'events' } })
    }
    return [...ancestors, { label: SCREEN_LABELS[view.id] ?? context.title ?? '현재 페이지' }]
  }

  const parent: EditorialBreadcrumbItem = {
    label: SCREEN_LABELS[view.parent],
    target: { kind: 'screen', id: view.parent },
  }
  const items = [...ancestors, parent]
  const currentLabel =
    CHILD_LABELS[view.id] ??
    context.title ??
    (context.hub ? findHubItem(context.hub, view.id)?.title : undefined) ??
    '자료 불러오는 중…'
  if (view.kind === 'article') {
    const collection = menuEntryFor(view.id, context.hub)
    if (collection && collection !== view.id)
      items.push({ label: CHILD_LABELS[collection], target: { kind: 'article', id: collection } })
  }
  return [...items, { label: currentLabel }]
}

export function EditorialBreadcrumb({
  items,
  onNavigate,
}: {
  items: EditorialBreadcrumbItem[]
  onNavigate: (target: BreadcrumbTarget) => void
}) {
  return (
    <nav
      aria-label="현재 위치"
      className="min-w-0 px-5 pt-6 text-xs sm:px-8 sm:pt-8 lg:px-[52px] lg:pt-[52px]"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 leading-6">
        {items.map((item, index) => (
          <li key={`${index}:${item.label}`} className="flex min-w-0 max-w-full items-center gap-2">
            {index > 0 && (
              <ChevronRight
                aria-hidden="true"
                size={13}
                className="shrink-0 text-[var(--editorial-muted)]"
              />
            )}
            {index < items.length - 1 && item.target ? (
              <button
                type="button"
                onClick={() => onNavigate(item.target!)}
                aria-label={`${item.label} 페이지로 이동`}
                className="min-w-0 break-words py-1 text-left text-[var(--editorial-muted)] hover:font-semibold hover:text-[var(--editorial-accent)]"
              >
                {item.label}
              </button>
            ) : (
              <span
                aria-current={index === items.length - 1 ? 'page' : undefined}
                className={`min-w-0 break-words py-1 ${index === items.length - 1 ? 'font-semibold text-[var(--editorial-accent)]' : 'tracking-wide text-[var(--editorial-muted)]'}`}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
