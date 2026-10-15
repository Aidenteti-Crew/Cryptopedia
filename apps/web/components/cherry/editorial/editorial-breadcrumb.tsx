import { ChevronRight } from 'lucide-react'

import { CHAPTER_NAV, PRIMARY_NAV, type ScreenId } from '@/lib/cryptopedia-taxonomy'
import { findHubItem, type HubData } from '@/lib/cryptopedia-hub'
import type { EditorialView } from './editorial-app'

export type BreadcrumbTarget = { kind: 'screen'; id: ScreenId } | { kind: 'article'; id: string }

export interface EditorialBreadcrumbItem {
  label: string
  target?: BreadcrumbTarget
}

const SCREEN_LABELS: Record<string, string> = {
  ecosystem: '생태계 홈',
  chains: '컬렉션 선택',
  'event-archive': '행사 아카이브',
  'builder-test': '빌더 유형 테스트',
  ...Object.fromEntries(
    [...PRIMARY_NAV, ...CHAPTER_NAV].map((item) => [item.id, item.label.replace(/^\d+\s+/, '')])
  ),
}
const CHILD_LABELS = Object.fromEntries(
  CHAPTER_NAV.flatMap((chapter) => chapter.children ?? []).map((child) => [child.id, child.label])
)

export function getEditorialBreadcrumbs(
  view: EditorialView,
  context: { title?: string; hub?: HubData } = {}
): EditorialBreadcrumbItem[] {
  const section: EditorialBreadcrumbItem = {
    label: CHAPTER_NAV.some(
      (chapter) => chapter.id === (view.kind === 'screen' ? view.id : view.parent)
    )
      ? 'CHAPTERS'
      : 'ECOSYSTEM',
  }
  const screen = view.kind === 'screen' ? view.id : view.parent
  const ancestors: EditorialBreadcrumbItem[] = [section]
  if (section.label === 'ECOSYSTEM' && screen !== 'ecosystem') {
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
    let collection: string | undefined
    if (view.id.startsWith('case-')) collection = 'practice'
    else if (view.id.startsWith('concept-')) collection = 'glossary'
    else if (view.id.startsWith('skill-') && !(view.id in CHILD_LABELS))
      collection = 'skill-library'
    else if (view.id.startsWith('resource-')) {
      const resource = context.hub?.resources.find((item) => item.id === view.id)
      if (resource)
        collection = {
          DOCS: 'official-docs',
          CODE: 'code-reference',
          ARTICLE: 'builder-articles',
          TOOL: 'mcp-tools',
        }[resource.kind]
    }
    if (collection)
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
