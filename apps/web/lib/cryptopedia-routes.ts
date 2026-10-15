import type { EditorialView } from '@/components/cherry/editorial/editorial-app'
import type { ScreenId } from './cryptopedia-taxonomy'

const SCREEN_PATHS: Partial<Record<ScreenId, string>> = {
  ecosystem: '/',
  chains: '/chains',
  projects: '/ecosystem/projects',
  macro: '/ecosystem/macro',
  events: '/ecosystem/events',
  'event-archive': '/ecosystem/events/archive',
  updates: '/ecosystem/updates',
  'builder-test': '/ecosystem/builder-test',
  fundamentals: '/chapters/fundamentals',
  builders: '/chapters/builders',
  academy: '/chapters/academy',
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
  if (view.kind === 'book') return `/ecosystem/projects/books/${encodeURIComponent(view.id)}`
  if (CHAPTERS.has(view.parent)) {
    return `/chapters/${view.parent}/${encodeURIComponent(view.id)}`
  }
  if (ECOSYSTEM_DETAILS.has(view.parent)) {
    return `/ecosystem/${view.parent}/${encodeURIComponent(view.id)}`
  }
  return `/ecosystem/articles/${encodeURIComponent(view.id)}`
}

export function editorialViewFromPath(pathname: string): EditorialView | null {
  const cleanPath = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname
  if (cleanPath === '/about') return { kind: 'screen', id: 'ecosystem' }
  const screen = PATH_SCREENS.get(cleanPath)
  if (screen) return { kind: 'screen', id: screen }

  const parts = cleanPath.split('/').filter(Boolean)
  if (
    parts.length === 4 &&
    parts[0] === 'ecosystem' &&
    parts[1] === 'projects' &&
    parts[2] === 'books'
  ) {
    const id = decodeEntryId(parts[3])
    return id ? { kind: 'book', id, parent: 'projects' } : null
  }
  if (parts.length !== 3) return null
  const [, parent, rawId] = parts
  const id = decodeEntryId(rawId)
  if (!id) return null
  if (parts[0] === 'chapters' && CHAPTERS.has(parent as ScreenId)) {
    return { kind: 'article', id, parent: parent as ScreenId }
  }
  if (parts[0] === 'ecosystem' && ECOSYSTEM_DETAILS.has(parent as ScreenId)) {
    return { kind: 'article', id, parent: parent as ScreenId }
  }
  if (parts[0] === 'ecosystem' && parent === 'articles') {
    return { kind: 'article', id, parent: 'ecosystem' }
  }
  return null
}
