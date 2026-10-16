'use client'

import { useEffect, type RefObject } from 'react'

// Scroll the page past its controls first, then let the focused reading pane scroll.
export function useReadingScroll(root: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const element = root.current
    if (!element || !enabled) return
    const scrollPastToolbar = (delta: number) => {
      if (!window.matchMedia('(min-width: 1280px)').matches || !delta) return false
      if (delta > 0) {
        const distance = element.getBoundingClientRect().top - 24
        if (distance <= 1) return false
        window.scrollBy({ top: Math.min(delta, distance), behavior: 'instant' })
      } else {
        if (window.scrollY <= 0) return false
        window.scrollBy({ top: -Math.min(-delta, window.scrollY), behavior: 'instant' })
      }
      return true
    }
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      if (scrollPastToolbar(event.deltaY * scale)) event.preventDefault()
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return
      const delta =
        event.key === 'PageDown'
          ? window.innerHeight * 0.8
          : event.key === 'PageUp'
            ? -window.innerHeight * 0.8
            : event.key === 'ArrowDown'
              ? 40
              : event.key === 'ArrowUp'
                ? -40
                : 0
      if (scrollPastToolbar(delta)) event.preventDefault()
    }
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('keydown', keydown)
    return () => {
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('keydown', keydown)
    }
  }, [root, enabled])
}
