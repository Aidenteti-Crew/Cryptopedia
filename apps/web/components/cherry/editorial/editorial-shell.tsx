import type { ReactNode } from "react"

import type { ScreenId } from "@/lib/cryptopedia-taxonomy"

import { EditorialIndex } from "./editorial-index"
import { EditorialMasthead } from "./editorial-masthead"
import { EditorialMobileIndex } from "./editorial-mobile-index"

interface EditorialShellProps {
  activeScreen: ScreenId
  activeChainName?: string
  onSelect: (screen: ScreenId) => void
  children: ReactNode
}

export function EditorialShell({
  activeScreen,
  activeChainName = "Avalanche",
  onSelect,
  children,
}: EditorialShellProps) {
  return (
    <div className="editorial-root">
      <EditorialMasthead onHome={() => onSelect("ecosystem")} />

      <div className="sm:grid sm:min-h-[calc(100dvh-105px)] sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="hidden sm:block">
          <EditorialIndex
            activeScreen={activeScreen}
            activeChainName={activeChainName}
            onSelect={onSelect}
          />
        </aside>

        <div className="sm:hidden">
          <EditorialMobileIndex
            activeScreen={activeScreen}
            activeChainName={activeChainName}
            onSelect={onSelect}
          />
        </div>

        <main className="min-w-0 bg-[var(--editorial-paper)]">{children}</main>
      </div>
    </div>
  )
}
