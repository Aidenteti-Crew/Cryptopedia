'use client'

import { useEffect, type RefObject } from 'react'

/* 페이지 스크롤과 안쪽 목록 스크롤을 한 줄로 이어 준다 (xl 이상, 목록이 고정 높이 상자일 때).
   - 아래로: 목록 영역이 화면 위(24px)에 닿을 때까지 페이지 → 그다음 목록 → 목록 끝이면 다시 페이지
   - 위로:   목록이 위로 더 갈 수 있으면 목록 → 목록 맨 위면 페이지
   예전에는 위로 굴리면 페이지부터 올라가 목록을 올릴 수 없었고, 목록 끝에서 페이지로 넘어가지 않았다. */
export function useReadingScroll(root: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const element = root.current
    if (!element || !enabled) return

    // 이벤트 위치에서 root 까지 올라가며 실제로 스크롤되는 상자를 찾는다
    const scrollerAt = (target: EventTarget | null): HTMLElement | null => {
      let node = target instanceof HTMLElement ? target : null
      while (node) {
        const { overflowY } = getComputedStyle(node)
        if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node
        if (node === element) return null
        node = node.parentElement
      }
      return null
    }

    const scrollPage = (delta: number) => {
      if (delta > 0) {
        const room = document.documentElement.scrollHeight - window.innerHeight - window.scrollY
        if (room <= 0) return false
        window.scrollBy({ top: Math.min(delta, room), behavior: 'instant' })
      } else {
        if (window.scrollY <= 0) return false
        window.scrollBy({ top: -Math.min(-delta, window.scrollY), behavior: 'instant' })
      }
      return true
    }

    // 목록·페이지 중 어느 쪽을 움직일지 직접 정해 움직인다. 브라우저에 맡기면 직전 제스처가
    // 붙어 있던 쪽(scroll latching)으로 휠이 가서 목록과 페이지가 섞여 움직인다.
    // true 면 처리 완료 (기본 스크롤 막음)
    const route = (delta: number, target: EventTarget | null) => {
      if (!window.matchMedia('(min-width: 1280px)').matches || !delta) return false
      const scroller = scrollerAt(target)
      const scrollList = () => {
        scroller!.scrollBy({ top: delta, behavior: 'instant' })
        return true
      }
      if (delta > 0) {
        // 목록이 화면 위에 닿기 전이면 페이지부터. 단, 화면이 길어 페이지가 더 내려갈 수 없으면
        // (목록이 끝내 위에 닿지 못하면) 건너뛰고 목록을 스크롤한다 — 안 그러면 휠이 헛돈다
        const distance = element.getBoundingClientRect().top - 24
        const room = document.documentElement.scrollHeight - window.innerHeight - window.scrollY
        if (distance > 1 && room > 1) {
          window.scrollBy({ top: Math.min(delta, distance, room), behavior: 'instant' })
          return true
        }
        const atBottom =
          !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
        return atBottom ? scrollPage(delta) : scrollList()
      }
      const atTop = !scroller || scroller.scrollTop <= 0
      return atTop ? scrollPage(delta) : scrollList()
    }

    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      if (route(event.deltaY * scale, event.target)) event.preventDefault()
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
      if (route(delta, event.target)) event.preventDefault()
    }
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('keydown', keydown)
    return () => {
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('keydown', keydown)
    }
  }, [root, enabled])
}
