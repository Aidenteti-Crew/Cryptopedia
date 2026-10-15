"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { ScreenId } from "@/lib/cryptopedia-taxonomy"

import { EditorialIndex, type EditorialIndexProps } from "./editorial-index"

/* ─────────────────────────────────────────────
   햄버거 메뉴 — 기존 Cherry MobileSidebar와 같은 동작:
   오른쪽에서 열리는 패널 안에 같은 목차를 그리고, 항목을 고르면 닫힌다.
───────────────────────────────────────────── */
export function EditorialMobileNav({
  activeScreen,
  activeEntryId,
  onSelect,
  onOpenEntry,
}: EditorialIndexProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="메뉴 열기"
          className="rounded-md p-2 text-[var(--editorial-muted)] hover:bg-[var(--editorial-hover)] hover:text-[var(--editorial-ink)]"
        >
          <Menu size={20} />
        </button>
      </SheetTrigger>
      {/* 패널은 body 로 포털되므로 editorial-root 를 다시 붙여 색 변수를 쓴다 */}
      <SheetContent
        side="right"
        className="editorial-root w-[260px] gap-0 border-l border-[var(--editorial-line)] bg-[var(--editorial-sidebar)] p-0 pt-10 sm:max-w-[260px]"
      >
        <SheetTitle className="sr-only">Cryptopedia 목차</SheetTitle>
        <EditorialIndex
          activeScreen={activeScreen}
          activeEntryId={activeEntryId}
          onSelect={(id: ScreenId) => {
            onSelect(id)
            setOpen(false)
          }}
          onOpenEntry={(id) => {
            onOpenEntry?.(id)
            setOpen(false)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
