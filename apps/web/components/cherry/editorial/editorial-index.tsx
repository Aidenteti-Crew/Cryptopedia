import {
  CHAPTER_NAV,
  PRIMARY_NAV,
  type ScreenId,
} from "@/lib/cryptopedia-taxonomy"

export interface EditorialIndexProps {
  activeScreen: ScreenId
  activeChainName?: string
  onSelect: (screen: ScreenId) => void
}

function IndexButton({
  id,
  label,
  activeScreen,
  onSelect,
}: {
  id: ScreenId
  label: string
  activeScreen: ScreenId
  onSelect: (screen: ScreenId) => void
}) {
  const active = id === activeScreen

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={active ? "page" : undefined}
      className={`min-h-12 w-full border-l-2 px-3 py-3.5 text-left text-[13px] leading-5 ${
        active
          ? "border-[var(--editorial-accent)] bg-[#202832] text-[var(--editorial-accent)]"
          : "border-transparent text-[var(--editorial-ink)] hover:bg-white/[0.04]"
      }`}
    >
      {label}
    </button>
  )
}

export function EditorialIndex({
  activeScreen,
  activeChainName = "Avalanche",
  onSelect,
}: EditorialIndexProps) {
  return (
    <nav
      aria-label="Cryptopedia 목차"
      className="flex h-full flex-col gap-5 bg-[var(--editorial-surface)] p-7"
    >
      <div>
        <p className="text-[11px] leading-4 text-[var(--editorial-muted)]">
          THE COLLECTION
        </p>
        <button
          type="button"
          onClick={() => onSelect("chains")}
          className="mt-4 min-h-12 w-full border-b border-[var(--editorial-line)] pb-5 text-left text-base text-[var(--editorial-ink)]"
        >
          {activeChainName}&nbsp; ↗
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onSelect("ecosystem")}
          aria-current={activeScreen === "ecosystem" ? "page" : undefined}
          className={`min-h-12 w-full border-l-2 px-3 py-3.5 text-left text-[13px] ${
            activeScreen === "ecosystem"
              ? "border-[var(--editorial-accent)] bg-[#202832] text-[var(--editorial-accent)]"
              : "border-transparent text-[var(--editorial-ink)]"
          }`}
        >
          생태계 · 매크로
        </button>
        <div className="ml-3 space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <IndexButton
              key={item.id}
              id={item.id}
              label={item.label}
              activeScreen={activeScreen}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {CHAPTER_NAV.map((item) => (
          <IndexButton
            key={item.id}
            id={item.id}
            label={item.label}
            activeScreen={activeScreen}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-1 text-[var(--editorial-muted)]">
        <p className="text-[13px] leading-5">REFERENCE LIBRARY</p>
        <p className="mt-5 text-[11px] leading-4">
          아이덴티티 크루가 함께
          <br />
          쌓아가는 블록체인 지식.
        </p>
      </div>
    </nav>
  )
}
