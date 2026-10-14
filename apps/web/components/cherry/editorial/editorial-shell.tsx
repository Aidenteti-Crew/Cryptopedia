import type { ReactNode } from 'react'

import type { ScreenId } from '@/lib/cryptopedia-taxonomy'

import { EditorialBrand, EditorialCollectionButton, type SelectedChain } from './editorial-brand'
import { EditorialIndex } from './editorial-index'
import { EditorialMobileNav } from './editorial-mobile-nav'
import { EditorialFooter } from './editorial-footer'
import {
  EditorialBreadcrumb,
  getEditorialBreadcrumbs,
  type BreadcrumbTarget,
  type EditorialBreadcrumbItem,
} from './editorial-breadcrumb'

interface EditorialShellProps {
  activeScreen: ScreenId
  activeEntryId?: string
  activeChainName?: string
  activeChainLogoUrl?: string
  onSelect: (screen: ScreenId) => void
  onSelectChain?: (chain: SelectedChain) => void
  onOpenEntry?: (id: string) => void
  breadcrumbs?: EditorialBreadcrumbItem[]
  onBreadcrumbNavigate?: (target: BreadcrumbTarget) => void
  children: ReactNode
}

/* ─────────────────────────────────────────────
   앱 셸 — 기존 Cherry 레이아웃과 같은 구조
   · lg 이상: 왼쪽 260px 사이드바(로고 + 컬렉션 선택 + 목차) / 오른쪽 본문
   · lg 미만: 상단 헤더(로고 · 컬렉션 · 햄버거) + 본문
───────────────────────────────────────────── */
export function EditorialShell({
  activeScreen,
  activeEntryId,
  activeChainName = 'Avalanche',
  activeChainLogoUrl,
  onSelect,
  onSelectChain,
  onOpenEntry,
  breadcrumbs,
  onBreadcrumbNavigate,
  children,
}: EditorialShellProps) {
  const goHome = () => onSelect('ecosystem')
  const collection = (
    <EditorialCollectionButton
      activeChainName={activeChainName}
      activeChainLogoUrl={activeChainLogoUrl}
      onSelectChain={onSelectChain}
    />
  )

  return (
    <div className="editorial-root lg:flex">
      {/* Desktop sidebar — hidden below lg */}
      <aside
        aria-label="Main navigation"
        className="sticky top-0 hidden h-[100dvh] w-[260px] shrink-0 flex-col bg-[var(--editorial-paper)] lg:flex"
      >
        <EditorialBrand
          onHome={goHome}
          className="shrink-0 px-5 pb-5 pt-6"
        />
        <div className="shrink-0 px-5 pt-2">{collection}</div>
        <EditorialIndex
          activeScreen={activeScreen}
          activeEntryId={activeEntryId}
          onSelect={onSelect}
          onOpenEntry={onOpenEntry}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header — hidden on lg+ */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--editorial-line)] bg-[var(--editorial-paper)] px-4 lg:hidden">
          <EditorialBrand onHome={goHome} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {collection}
            <EditorialMobileNav
              activeScreen={activeScreen}
              activeEntryId={activeEntryId}
              onSelect={onSelect}
              onOpenEntry={onOpenEntry}
            />
          </div>
        </header>

        <main className="min-w-0 flex-1 bg-[var(--editorial-paper)]">
          <EditorialBreadcrumb
            items={breadcrumbs ?? getEditorialBreadcrumbs({ kind: 'screen', id: activeScreen })}
            onNavigate={
              onBreadcrumbNavigate ??
              ((target) =>
                target.kind === 'screen' ? onSelect(target.id) : onOpenEntry?.(target.id))
            }
          />
          {children}
        </main>
        <EditorialFooter onHome={goHome} onOpenEntry={onOpenEntry} />
      </div>
    </div>
  )
}
