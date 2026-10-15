import Image from 'next/image'
import { ClipboardList } from 'lucide-react'
import { EDITORIAL_BRAND } from './editorial-brand'

export function EditorialFooter({ onHome }: { onHome: () => void }) {
  const linkClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--editorial-muted)] hover:bg-[var(--editorial-line)] hover:text-[var(--editorial-accent)]'
  return (
    <footer
      aria-label="사이트 푸터"
      className="shrink-0 bg-[var(--editorial-paper)] px-5 pb-6 pt-6 sm:px-8 sm:pb-8 lg:px-[52px]"
    >
      <div className="flex flex-col gap-6 border-t border-[var(--editorial-line)] pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onHome}
            aria-label="푸터: Chainery 홈"
            className="flex items-center gap-2.5 text-[var(--editorial-ink)] hover:text-[var(--editorial-accent)]"
          >
            <Image
              src="/cryptopedia/assets/chainery-logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-md bg-violet-soft p-1"
            />
            <span className="editorial-display text-[24px] leading-tight">
              {EDITORIAL_BRAND.name}
            </span>
          </button>
          <p className="mt-2 text-xs text-[var(--editorial-muted)]">블록체인 지식 라이브러리</p>
          <p className="mt-2 text-[10px] text-[var(--editorial-muted)]">{EDITORIAL_BRAND.byline}</p>
        </div>
        <nav aria-label="푸터 바로가기" className="flex flex-wrap gap-2">
          <a
            href="https://app.notion.com/p/kingyoungdae/a-dent-ti-Overview-KR-20942b28236580adb8e1e69c3338c978?__dm_a=1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="소개 페이지"
            title="소개 페이지"
            className={linkClass}
          >
            <Image
              src="/cryptopedia/assets/aidenteti-seal.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain rounded-full bg-white"
            />
          </a>
          <a
            href="https://x.com/Aidenteti_"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            title="X"
            className={linkClass}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
              <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.585-6.64 7.585H.47l8.6-9.83L0 1.154h7.594l5.243 6.93 6.064-6.93zm-1.3 19.49h2.039L6.486 3.24H4.297L17.6 20.643z" />
            </svg>
          </a>
          <a
            href="https://forms.gle/6DVS7RqWUbwjTdFC9"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="신청폼"
            title="신청폼"
            className={`${linkClass}`}
          >
            <ClipboardList aria-hidden="true" size={24} className="text-violet-foreground" />
          </a>
        </nav>
      </div>
      <p className="mt-6 text-[10px] tracking-wide text-[var(--editorial-muted)]">
        © {new Date().getFullYear()} Aidenteti Crew
      </p>
    </footer>
  )
}
