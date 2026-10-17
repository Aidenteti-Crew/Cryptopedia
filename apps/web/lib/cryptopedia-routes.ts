import type { EditorialView } from '@/components/cherry/editorial/editorial-app'
import type { ScreenId } from './cryptopedia-taxonomy'

/* 생태계 화면은 app/(chainery)/(ecosystem) 라우트 그룹이라 주소에 /ecosystem 이 붙지 않는다 */
const SCREEN_PATHS: Partial<Record<ScreenId, string>> = {
  ecosystem: '/',
  chains: '/chains',
  projects: '/projects',
  macro: '/macro',
  events: '/events',
  'event-archive': '/events/archive',
  updates: '/updates',
  'builder-test': '/builder-test',
  // LEARN 화면은 app/(chainery)/(learn) 라우트 그룹 — 주소는 메뉴 이름(핵심 개념·에이전트 스킬)을 따른다
  fundamentals: '/concepts',
  builders: '/skills',
  academy: '/academy',
}

const PATH_SCREENS = new Map(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen as ScreenId])
)
const CHAPTERS = new Set<ScreenId>(['fundamentals', 'builders', 'academy'])
const ECOSYSTEM_DETAILS = new Set<ScreenId>(['projects', 'macro', 'events', 'updates'])

function decodeEntryId(rawId: string): string | null {
  try {
    const id = decodeURIComponent(rawId)
    return id && !id.includes('/') ? id : null
  } catch {
    return null
  }
}

export function pathForEditorialView(view: EditorialView): string {
  if (view.kind === 'screen') {
    const path = SCREEN_PATHS[view.id]
    if (!path) throw new Error(`Unknown editorial screen: ${view.id}`)
    return path
  }
  if (view.kind === 'book') return `/projects/books/${encodeURIComponent(view.id)}`
  if (CHAPTERS.has(view.parent)) {
    return `${SCREEN_PATHS[view.parent]}/${encodeURIComponent(view.id)}`
  }
  if (ECOSYSTEM_DETAILS.has(view.parent)) {
    return `/${view.parent}/${encodeURIComponent(view.id)}`
  }
  return `/articles/${encodeURIComponent(view.id)}`
}

export function editorialViewFromPath(pathname: string): EditorialView | null {
  const cleanPath = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname
  if (cleanPath === '/about') return { kind: 'screen', id: 'ecosystem' }
  const screen = PATH_SCREENS.get(cleanPath)
  if (screen) return { kind: 'screen', id: screen }

  const parts = cleanPath.split('/').filter(Boolean)
  // /projects/books/:id
  if (parts.length === 3 && parts[0] === 'projects' && parts[1] === 'books') {
    const id = decodeEntryId(parts[2])
    return id ? { kind: 'book', id, parent: 'projects' } : null
  }
  if (parts.length !== 2) return null
  // /academy/:id · /concepts/:id · /skills/:id
  const chapter = PATH_SCREENS.get(`/${parts[0]}`)
  if (chapter && CHAPTERS.has(chapter)) {
    const id = decodeEntryId(parts[1])
    return id ? { kind: 'article', id, parent: chapter } : null
  }
  // /:section/:id (projects·macro·events·updates) 와 /articles/:id
  const [parent, rawId] = parts
  const id = decodeEntryId(rawId)
  if (!id) return null
  if (ECOSYSTEM_DETAILS.has(parent as ScreenId)) {
    return { kind: 'article', id, parent: parent as ScreenId }
  }
  if (parent === 'articles') return { kind: 'article', id, parent: 'ecosystem' }
  return null
}
