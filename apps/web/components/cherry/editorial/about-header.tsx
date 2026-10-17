'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { pathForEditorialView } from '@/lib/cryptopedia-routes'
import {
  CHAPTER_NAV,
  ECOSYSTEM_HOME_NAV,
  PRIMARY_NAV,
  resolveParentScreen,
  type ScreenId,
} from '@/lib/cryptopedia-taxonomy'

import { EditorialBrand, EditorialCollectionButton } from './editorial-brand'
import { useEditorialChain } from './editorial-chain-provider'
import { EditorialMobileNav } from './editorial-mobile-nav'
import styles from './about-page.module.css'

/* /about 랜딩 전용 헤더 — 사이드바 셸 대신 화면 위에 떠 있는 가로 헤더.
   왼쪽: 로고 + 생태계 홈 · 챕터, 오른쪽: 컬렉션 선택.
   데스크톱은 메뉴에 hover 하면 사이드바와 같은 하위 메뉴가 펼쳐지고,
   모바일은 앱과 같은 햄버거 메뉴(EditorialMobileNav)를 쓴다. */

const screenPath = (id: ScreenId) => pathForEditorialView({ kind: 'screen', id })

/* 챕터 하위 항목(문서) 경로 — editorial-app 의 openArticle 과 같은 규칙 */
const entryPath = (id: string, fallbackParent: ScreenId) =>
  pathForEditorialView({ kind: 'article', id, parent: resolveParentScreen(id) ?? fallbackParent })

/* 사이드바와 같은 순서 — 생태계 홈 다음 챕터는 CHAPTER_NAV 순서(아카데미가 맨 위)를 따른다 */
const NAV_MENUS = [
  {
    id: 'ecosystem',
    label: ECOSYSTEM_HOME_NAV.label,
    href: screenPath('ecosystem'),
    children: PRIMARY_NAV.map((item) => ({ label: item.label, href: screenPath(item.id) })),
  },
  ...CHAPTER_NAV.map((chapter) => ({
    id: chapter.id,
    label: chapter.label,
    href: screenPath(chapter.id),
    children: (chapter.children ?? []).map((child) => ({
      label: child.label,
      href: entryPath(child.id, chapter.id),
    })),
  })),
]

export function AboutHeader() {
  const router = useRouter()
  const { activeChain, setActiveChain } = useEditorialChain()
  // 펼쳐진 하위 메뉴 — 띠는 하나만 두고 항목만 바꿔 끼워 옆 메뉴로 옮길 때 깜빡이지 않게 한다
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const openMenu = NAV_MENUS.find((menu) => menu.id === openMenuId)
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
          {NAV_MENUS.map((menu) => (
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

        <div className={styles.headerActions}>
          <div className={styles.collection}>
            <EditorialCollectionButton
              activeChainName={activeChain.name}
              activeChainLogoUrl={activeChain.logoUrl}
              onSelectChain={(chain) => {
                setActiveChain(chain)
                router.push('/')
              }}
            />
          </div>
          <div className={styles.mobileOnly}>
            <EditorialMobileNav
              onSelect={(id) => router.push(screenPath(id))}
              onOpenEntry={(id) => router.push(entryPath(id, 'ecosystem'))}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
