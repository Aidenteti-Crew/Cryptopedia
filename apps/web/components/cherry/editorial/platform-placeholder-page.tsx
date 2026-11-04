import Link from 'next/link'

import { pathForEditorialView } from '@/lib/cryptopedia-routes'

import { AboutHeader } from './about-header'
import styles from './about-page.module.css'

/* 아직 내용이 없는 플랫폼 페이지(채용 · 행사/이벤트) — 입구와 같은 헤더에 "준비 중" 안내만 */
export function PlatformPlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className={`editorial-root ${styles.landing}`}>
      <AboutHeader />
      <main className="flex min-h-[100dvh] flex-col items-start justify-center px-6 pb-24 pt-32 sm:px-[196px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-accent)]">
          Coming soon
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[var(--editorial-strong)] sm:text-[40px]">
          {title}
        </h1>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-7 text-[var(--editorial-muted)]">
          {description} 지금은 준비 중이에요.
        </p>
        <Link
          href={pathForEditorialView({ kind: 'screen', id: 'ecosystem' })}
          className="mt-8 border border-[var(--editorial-line)] px-4 py-2.5 text-sm text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
        >
          블록체인 지식 둘러보기 →
        </Link>
      </main>
    </div>
  )
}
