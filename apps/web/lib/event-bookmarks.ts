import { useCallback, useMemo, useSyncExternalStore } from 'react'

// Saved events live in this browser only. Everything that reads or writes them goes through this
// module, so a signed-in server store can replace it later without touching the pages.
const STORAGE_KEY = 'chainery:event-bookmarks'

export function toggleBookmark(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id]
}

export function parseBookmarks(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id !== ''))]
  } catch {
    return []
  }
}

const listeners = new Set<() => void>()
// Storage can be blocked (private windows, site data off); saving then lasts until the tab closes.
let memory: string | null = null
let storageBroken = false

function readRaw(): string | null {
  if (storageBroken) return memory
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    storageBroken = true
    return memory
  }
}

function writeRaw(raw: string) {
  memory = raw
  if (!storageBroken) {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw)
    } catch {
      storageBroken = true
    }
  }
  listeners.forEach((listener) => listener())
}

export function toggleStoredBookmark(id: string) {
  writeRaw(JSON.stringify(toggleBookmark(parseBookmarks(readRaw()), id)))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export interface EventBookmarks {
  ids: string[]
  has: (id: string) => boolean
  toggle: (id: string) => void
}

export function useEventBookmarks(): EventBookmarks {
  // The snapshot is the raw string, so React compares it by value and re-renders only on a real change.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  const ids = useMemo(() => parseBookmarks(raw), [raw])
  const saved = useMemo(() => new Set(ids), [ids])
  const has = useCallback((id: string) => saved.has(id), [saved])
  return useMemo(() => ({ ids, has, toggle: toggleStoredBookmark }), [ids, has])
}
