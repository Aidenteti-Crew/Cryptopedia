'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// Per-tab memory only; no server persistence or cross-user storage.
const remembered = new Map<string, unknown>()
const scrollPositions = new Map<string, number>()

export function rememberDiscoveryScroll(key: string) {
  scrollPositions.set(key, window.scrollY)
}

export function DiscoveryScrollRestore({ stateKey }: { stateKey: string }) {
  useEffect(() => {
    const position = scrollPositions.get(stateKey)
    if (position === undefined) return
    let inner = 0
    const frame = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => window.scrollTo({ top: position, behavior: 'instant' }))
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(inner)
    }
  }, [stateKey])
  return null
}

export function useDiscoveryState<T>(
  key: string,
  initial: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    remembered.has(key)
      ? (remembered.get(key) as T)
      : typeof initial === 'function'
        ? (initial as () => T)()
        : initial
  )
  useEffect(() => {
    remembered.set(key, value)
  }, [key, value])
  return [value, setValue]
}

export function useDiscoveryView<T extends string>(
  key: string,
  storageKey: string,
  initial: T,
  allowed: readonly T[]
) {
  const [view, setView] = useDiscoveryState<T>(key, () => {
    if (typeof window !== 'undefined')
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored && allowed.includes(stored as T)) return stored as T
      } catch {
        /* Storage can be unavailable in private contexts. */
      }
    return initial
  })
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, view)
    } catch {
      /* The view still works without persistent storage. */
    }
  }, [storageKey, view])
  return [view, setView] as const
}
