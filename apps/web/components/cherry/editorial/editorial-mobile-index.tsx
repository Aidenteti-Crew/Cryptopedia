import {
  CHAPTER_NAV,
  PRIMARY_NAV,
  type ScreenId,
} from "@/lib/cryptopedia-taxonomy"

import type { EditorialIndexProps } from "./editorial-index"

export function EditorialMobileIndex({
  activeScreen,
  activeChainName = "Avalanche",
  onSelect,
}: EditorialIndexProps) {
  const itemClass = (id: ScreenId) =>
    `min-h-10 border-l-2 px-3 py-2 text-left text-xs ${
      activeScreen === id
        ? "border-[var(--editorial-accent)] bg-[#202832] text-[var(--editorial-accent)]"
        : "border-transparent text-[var(--editorial-muted)]"
    }`

  return (
    <nav
      aria-label="Cryptopedia 모바일 목차"
      className="bg-[var(--editorial-surface)] px-5 py-5"
    >
      <p className="text-[11px] leading-4 text-[var(--editorial-muted)]">
        THE COLLECTION
      </p>
      <button
        type="button"
        onClick={() => onSelect("chains")}
        className="mt-3 min-h-11 w-full border-b border-[var(--editorial-line)] pb-4 text-left text-base"
      >
        {activeChainName}&nbsp; ↗
      </button>

      <button
        type="button"
        onClick={() => onSelect("ecosystem")}
        aria-current={activeScreen === "ecosystem" ? "page" : undefined}
        className={`mt-5 min-h-10 w-full border-l-2 px-3 py-2 text-left text-[13px] ${
          activeScreen === "ecosystem"
            ? "border-[var(--editorial-accent)] bg-[#202832] text-[var(--editorial-accent)]"
            : "border-transparent"
        }`}
      >
        생태계 · 매크로
      </button>
      <div className="mt-2 grid grid-cols-2 gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={activeScreen === item.id ? "page" : undefined}
            className={itemClass(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-1">
        {CHAPTER_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={activeScreen === item.id ? "page" : undefined}
            className={itemClass(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
