"use client"

import { useEffect, useState, type ReactNode } from "react"
import { BookOpen, ChevronDown, Code2, Globe, GraduationCap } from "lucide-react"

import {
  CHAPTER_NAV,
  PRIMARY_NAV,
  type ScreenId,
} from "@/lib/cryptopedia-taxonomy"

/* ─────────────────────────────────────────────
   목차 — 기존 Cherry 사이드바 nav 구조를 그대로 따른다.
   섹션 라벨 → 아이콘 그룹 → 좌측 선으로 묶인 하위 항목.
   그룹 본문 클릭 = 이동 + 펼치기, 오른쪽 화살표 = 접기/펴기.
───────────────────────────────────────────── */

export interface EditorialIndexProps {
  activeScreen: ScreenId
  /** 문서 상세를 보고 있을 때 그 문서 id — 해당 하위 항목을 활성으로 표시 */
  activeEntryId?: string
  onSelect: (screen: ScreenId) => void
  /** 챕터 하위 항목(문서) 열기 */
  onOpenEntry?: (id: string) => void
  className?: string
}

type ChildKind = "screen" | "entry"

interface GroupDef {
  id: ScreenId
  label: string
  icon: ReactNode
  childKind: ChildKind
  children: { id: string; label: string }[]
}

interface SectionDef {
  id: string
  label: string
  groups: GroupDef[]
}

const ICON_SIZE = 18

const CHAPTER_ICON: Partial<Record<ScreenId, ReactNode>> = {
  fundamentals: <BookOpen size={ICON_SIZE} strokeWidth={1.6} />,
  builders: <Code2 size={ICON_SIZE} strokeWidth={1.6} />,
  academy: <GraduationCap size={ICON_SIZE} strokeWidth={1.6} />,
}

const SECTIONS: SectionDef[] = [
  {
    id: "ecosystem",
    label: "ECOSYSTEM",
    groups: [
      {
        id: "ecosystem",
        label: "생태계 홈",
        icon: <Globe size={ICON_SIZE} strokeWidth={1.6} />,
        childKind: "screen",
        children: PRIMARY_NAV.map((item) => ({ id: item.id, label: item.label })),
      },
    ],
  },
  {
    id: "chapters",
    label: "CHAPTERS",
    groups: CHAPTER_NAV.map((item) => ({
      id: item.id,
      label: item.label,
      icon: CHAPTER_ICON[item.id],
      childKind: "entry" as const,
      children: item.children ?? [],
    })),
  },
]

/* 기본: 생태계는 펼침, 챕터는 접힘 (기존 Cherry 기본값과 같은 방식) */
const DEFAULT_COLLAPSED: Record<string, boolean> = {
  ecosystem: false,
  fundamentals: true,
  builders: true,
  academy: true,
}

function groupOf(screen: ScreenId, entryId?: string): ScreenId | null {
  for (const section of SECTIONS) {
    for (const group of section.groups) {
      if (group.id === screen) return group.id
      if (group.childKind === "screen" && group.children.some((c) => c.id === screen)) {
        return group.id
      }
      if (entryId && group.children.some((c) => c.id === entryId)) return group.id
    }
  }
  return null
}

function NavButton({
  label,
  icon,
  active,
  isChild = false,
  hasActiveChild = false,
  collapsed,
  onClick,
  onToggle,
}: {
  label: string
  icon?: ReactNode
  active: boolean
  isChild?: boolean
  /** 펼쳐진 그룹 안에 실제 선택된 하위 항목이 있을 때 — 배경 없이 글자만 살짝 진하게 */
  hasActiveChild?: boolean
  collapsed?: boolean
  onClick: () => void
  onToggle?: () => void
}) {
  const hasToggle = !!onToggle

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-expanded={hasToggle ? !collapsed : undefined}
      className={`relative flex w-full items-center gap-3 rounded-[12px] text-left leading-[1.25] ${
        isChild ? "min-h-[40px] px-3 py-2 text-[14px]" : "min-h-[48px] px-3.5 py-2.5 text-[15px]"
      } ${
        active
          ? isChild
            ? "bg-[var(--editorial-active-soft)] font-medium text-[var(--editorial-ink)]"
            : "bg-[var(--editorial-active)] font-medium text-[var(--editorial-strong)]"
          : `${hasActiveChild ? "font-medium" : "font-normal"} text-[var(--editorial-ink)] hover:bg-[var(--editorial-hover)]`
      }`}
    >
      {active && isChild && (
        <span
          aria-hidden="true"
          className="absolute -left-[15px] top-2 bottom-2 w-[2px] rounded-full bg-[var(--editorial-mark)]"
        />
      )}
      {icon && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
      )}
      <span className="min-w-0 flex-1 whitespace-pre-wrap">{label}</span>
      {hasToggle && (
        <span
          role="button"
          aria-label={collapsed ? "펼치기" : "접기"}
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          className="-my-2 -mr-2 flex w-8 shrink-0 cursor-pointer items-center justify-center self-stretch"
        >
          <ChevronDown
            size={13}
            className={`opacity-70 transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
          />
        </span>
      )}
    </button>
  )
}

export function EditorialIndex({
  activeScreen,
  activeEntryId,
  onSelect,
  onOpenEntry,
  className = "",
}: EditorialIndexProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED)

  /* 현재 보고 있는 화면이 속한 그룹은 자동으로 펼친다 (닫지는 않는다 → 메뉴가 튀지 않음) */
  useEffect(() => {
    const group = groupOf(activeScreen, activeEntryId)
    if (!group) return
    setCollapsed((current) => (current[group] === false ? current : { ...current, [group]: false }))
  }, [activeScreen, activeEntryId])

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  const open = (id: string) =>
    setCollapsed((c) => (c[id] === false ? c : { ...c, [id]: false }))

  return (
    <nav
      aria-label="Cryptopedia 목차"
      className={`flex-1 overflow-y-auto px-3 pb-7 pt-3.5 ${className}`}
    >
      {SECTIONS.map((section, si) => (
        <div key={section.id} className={si === 0 ? "mt-0.5" : "mt-6"}>
          <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[1.1px] text-[var(--editorial-muted)]">
            {section.label}
          </div>

          {section.groups.map((group) => {
            const isCollapsed = !!collapsed[group.id]
            const childActive = group.children.some((child) =>
              group.childKind === "screen"
                ? child.id === activeScreen
                : child.id === activeEntryId,
            )
            const groupActive = activeScreen === group.id && !childActive && !activeEntryId

            return (
              <div key={group.id} className="mb-1 last:mb-0">
                <NavButton
                  label={group.label}
                  icon={group.icon}
                  active={groupActive}
                  hasActiveChild={childActive}
                  collapsed={isCollapsed}
                  onClick={() => {
                    open(group.id)
                    onSelect(group.id)
                  }}
                  onToggle={() => toggle(group.id)}
                />
                {!isCollapsed && (
                  <div className="ml-[18px] mt-1 mb-1 space-y-1 border-l border-[var(--editorial-line)]/60 pl-3.5">
                    {group.children.map((child) => {
                      const active =
                        group.childKind === "screen"
                          ? child.id === activeScreen
                          : child.id === activeEntryId
                      return (
                        <NavButton
                          key={child.id}
                          label={child.label}
                          active={active}
                          isChild
                          onClick={() =>
                            group.childKind === "screen"
                              ? onSelect(child.id as ScreenId)
                              : onOpenEntry?.(child.id)
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
