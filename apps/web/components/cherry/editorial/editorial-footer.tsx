import { EDITORIAL_BRAND } from './editorial-brand'

export function EditorialFooter({
  onHome,
  onOpenEntry,
}: {
  onHome: () => void
  onOpenEntry?: (id: string) => void
}) {
  const linkClass =
    'min-h-9 py-2 text-xs text-[var(--editorial-muted)] hover:font-semibold hover:text-[var(--editorial-accent)]'
  return (
    <footer
      aria-label="사이트 푸터"
      className="shrink-0 bg-[var(--editorial-paper)] px-4 pb-6 pt-6 sm:px-8 sm:pb-8 lg:px-[52px]"
    >
      <div className="flex flex-col gap-6 border-t border-[var(--editorial-line)] pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onHome}
            aria-label="푸터: 생태계 홈"
            className="editorial-display text-[24px] leading-tight text-[var(--editorial-ink)] hover:text-[var(--editorial-accent)]"
          >
            {EDITORIAL_BRAND.name}
          </button>
          <p className="mt-2 text-xs text-[var(--editorial-muted)]">블록체인 지식 라이브러리</p>
          <p className="mt-2 text-[10px] text-[var(--editorial-muted)]">{EDITORIAL_BRAND.byline}</p>
        </div>
        <nav aria-label="푸터 바로가기" className="flex flex-wrap gap-x-6 gap-y-1">
          <button
            type="button"
            onClick={onHome}
            aria-label="푸터: 홈으로 이동"
            className={linkClass}
          >
            생태계 홈
          </button>
          {onOpenEntry && (
            <>
              <button
                type="button"
                onClick={() => onOpenEntry('practice')}
                aria-label="푸터: 케이스별 실습"
                className={linkClass}
              >
                케이스별 실습
              </button>
              <button
                type="button"
                onClick={() => onOpenEntry('skill-library')}
                aria-label="푸터: 스킬 라이브러리"
                className={linkClass}
              >
                스킬 라이브러리
              </button>
            </>
          )}
        </nav>
      </div>
      <p className="mt-6 text-[10px] tracking-wide text-[var(--editorial-muted)]">
        © {new Date().getFullYear()} Aidenteti Crew
      </p>
    </footer>
  )
}
