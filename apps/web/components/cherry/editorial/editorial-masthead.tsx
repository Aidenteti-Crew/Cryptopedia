import Image from "next/image"

interface EditorialMastheadProps {
  onHome: () => void
}

export function EditorialMasthead({ onHome }: EditorialMastheadProps) {
  return (
    <header className="flex h-[103px] items-center gap-4 border-b border-[var(--editorial-line)] px-5 py-5 sm:h-[105px] sm:px-8">
      <button
        type="button"
        onClick={onHome}
        className="flex min-h-12 min-w-12 shrink-0 items-center justify-center sm:min-h-16 sm:min-w-16"
        aria-label="Cryptopedia 홈"
      >
        <Image
          src="/cryptopedia/assets/aidenteti-seal.png"
          alt="Aidenteti Crew seal"
          width={64}
          height={64}
          priority
          className="h-12 w-12 sm:h-16 sm:w-16"
        />
      </button>

      <button
        type="button"
        onClick={onHome}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block text-[11px] leading-4 text-[var(--editorial-muted)]">
          AIDENTETI CREW
        </span>
        <span className="editorial-display block text-[30px] leading-[1.5] text-[var(--editorial-ink)]">
          Cryptopedia
        </span>
      </button>

      <p className="hidden w-60 shrink-0 text-right text-[11px] leading-4 text-[var(--editorial-muted)] sm:block">
        <span className="block">THE BLOCKCHAIN ENCYCLOPEDIA</span>
        <span className="block">KNOWLEDGE, CONNECTED.</span>
      </p>
    </header>
  )
}
