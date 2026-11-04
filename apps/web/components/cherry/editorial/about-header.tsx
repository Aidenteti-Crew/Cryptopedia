'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Menu } from 'lucide-react'

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { pathForEditorialView } from '@/lib/cryptopedia-routes'
import {
  CHAPTER_NAV,
  ECOSYSTEM_HOME_NAV,
  PRIMARY_NAV,
  type ScreenId,
} from '@/lib/cryptopedia-taxonomy'

import { EditorialBrand } from './editorial-brand'
import styles from './about-page.module.css'

/* 플랫폼 헤더 — 입구(/)와 채용·행사 페이지가 함께 쓰는, 화면 위에 떠 있는 가로 헤더.
   왼쪽: 로고 + 플랫폼 메뉴(채용 · 행사/이벤트 · 블록체인 지식), 오른쪽: 비워 둔 자리(나중에 로그인·내 정보).
   데스크톱은 블록체인 지식에 hover 하면 지식 섹션의 하위 메뉴가 펼쳐지고,
   모바일은 오른쪽에서 열리는 패널에 같은 메뉴를 그린다. */

const screenPath = (id: ScreenId) => pathForEditorialView({ kind: 'screen', id })

/* 블록체인 지식의 하위 메뉴 — 사이드바와 같은 순서(생태계 홈 · LIVE · LEARN 챕터) */
const KNOWLEDGE_LINKS = [
  { label: ECOSYSTEM_HOME_NAV.label, href: screenPath('ecosystem') },
  ...PRIMARY_NAV.map((item) => ({ label: item.label, href: screenPath(item.id) })),
  ...CHAPTER_NAV.map((chapter) => ({ label: chapter.label, href: screenPath(chapter.id) })),
]

export const PLATFORM_MENUS: {
  id: string
  label: string
  href: string
  children: { label: string; href: string }[]
}[] = [
  { id: 'careers', label: '채용', href: '/careers', children: [] },
  { id: 'events', label: '행사/이벤트', href: '/events', children: [] },
  {
    id: 'knowledge',
    label: '블록체인 지식',
    href: screenPath('ecosystem'),
    children: KNOWLEDGE_LINKS,
  },
]

export function AboutHeader() {
  const router = useRouter()
  // 펼쳐진 하위 메뉴 — 띠는 하나만 두고 항목만 바꿔 끼워 옆 메뉴로 옮길 때 깜빡이지 않게 한다
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const openMenu = PLATFORM_MENUS.find((menu) => menu.id === openMenuId && menu.children.length)
  // 닫히며 흐려지는 동안에도 마지막 항목을 보여 준다 (빈 띠만 사라지지 않게)
  const lastMenu = useRef(openMenu)
  if (openMenu) lastMenu.current = openMenu
  const shownMenu = openMenu ?? lastMenu.current

  return (
    // right-scroll-bar-position: 드롭다운이 열려 스크롤바가 사라져도 고정 헤더 폭이 그대로 (버튼이 밀리지 않게)
    <header className={`${styles.header} right-scroll-bar-position`}>
      <div className={styles.headerBar}>
        <EditorialBrand onHome={() => router.push('/')} className="shrink-0" />

        {/* 띠가 nav 안에 있어 메뉴 → 띠로 내려가도 mouseleave 가 나지 않는다 */}
        <nav
          aria-label="주요 메뉴"
          className={styles.headerNav}
          onMouseLeave={() => setOpenMenuId(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenuId(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpenMenuId(null)
          }}
        >
          {PLATFORM_MENUS.map((menu) => (
            <div
              key={menu.id}
              className={styles.headerMenu}
              onMouseEnter={() => setOpenMenuId(menu.id)}
              onFocus={() => setOpenMenuId(menu.id)}
            >
              <Link
                href={menu.href}
                className={styles.headerLink}
                data-open={menu.id === openMenuId || undefined}
                aria-expanded={menu.id === openMenuId}
              >
                {menu.label}
              </Link>
            </div>
          ))}

          <div className={styles.submenu} data-open={!!openMenu || undefined}>
            {shownMenu && (
              <ul key={shownMenu.id} className={styles.submenuPanel}>
                {shownMenu.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className={styles.submenuLink}
                      onClick={() => setOpenMenuId(null)}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>

        {/* 오른쪽 자리는 로그인 · 내 정보가 들어올 때까지 비워 둔다 */}
        <div className={styles.headerActions}>
          <div className={styles.mobileOnly}>
            <PlatformMobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}

function PlatformMobileNav() {
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
        <SheetTitle className="sr-only">chainery 메뉴</SheetTitle>
        <nav aria-label="플랫폼 메뉴" className="flex flex-col px-3 pb-6">
          {PLATFORM_MENUS.map((menu) => (
            <div key={menu.id} className="py-1">
              <Link
                href={menu.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-[15px] text-[var(--editorial-ink)] hover:bg-[var(--editorial-hover)]"
              >
                {menu.label}
              </Link>
              {menu.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setOpen(false)}
                  className="block py-1.5 pl-6 pr-3 text-[13.5px] text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
