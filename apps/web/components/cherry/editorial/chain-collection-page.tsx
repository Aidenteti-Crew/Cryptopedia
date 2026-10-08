import type { ChainCollectionPageData } from "@/lib/cryptopedia-types"

interface ChainCollectionPageProps {
  data: ChainCollectionPageData
  onBack: () => void
  onOpenChain: (id: string) => void
}

export function ChainCollectionPage({
  data,
  onBack,
  onOpenChain,
}: ChainCollectionPageProps) {
  const current = data.items.find((item) => item.id === data.currentChainId)

  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <button
        type="button"
        onClick={onBack}
        className="min-h-10 text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
      >
        ← 목록으로 돌아가기
      </button>
      <p className="mt-5 text-[11px] text-[var(--editorial-accent)]">
        {data.breadcrumb.join(" / ")}
      </p>
      <h1 className="mt-3 text-[34px] font-normal leading-[1.55]">
        {data.title}
      </h1>
      <p className="editorial-copy mt-3 text-sm text-[var(--editorial-muted)]">
        {data.subtitle}
      </p>

      <section className="mt-7">
        <h2 className="border-b border-[var(--editorial-line)] pb-4 text-base">
          자료 목록
        </h2>
        {data.items.map((item) => {
          const available = item.status === "AVAILABLE"
          return (
            <button
              key={item.id}
              type="button"
              disabled={!available}
              onClick={() => onOpenChain(item.id)}
              className="group flex min-h-[95px] w-full items-start gap-6 border-b border-[var(--editorial-line)] py-5 text-left disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="w-11 shrink-0 text-xs tabular-nums text-[var(--editorial-accent)]">
                {String(item.order).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] group-enabled:group-hover:text-[var(--editorial-accent)]">
                  {item.name}
                </span>
                <span className="mt-1.5 block text-sm text-[var(--editorial-muted)]">
                  {item.summary}
                </span>
              </span>
              {available ? <span className="text-xl">↗</span> : null}
            </button>
          )
        })}
      </section>

      {current ? (
        <button
          type="button"
          onClick={() => onOpenChain(current.id)}
          className="mt-7 min-h-11 text-sm text-[var(--editorial-accent)]"
        >
          {current.name} 열기 →
        </button>
      ) : null}
    </article>
  )
}
