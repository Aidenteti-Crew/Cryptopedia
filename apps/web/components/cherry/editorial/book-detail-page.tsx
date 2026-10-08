import Image from "next/image"

import type { BookDetail } from "@/lib/cryptopedia-types"

import { ContentEntryList } from "./content-entry-list"

interface BookDetailPageProps {
  book: BookDetail
  onBack: () => void
  onOpenChapter: (id: string) => void
}

export function BookDetailPage({
  book,
  onBack,
  onOpenChapter,
}: BookDetailPageProps) {
  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <button
        type="button"
        onClick={onBack}
        className="min-h-10 text-left text-xs text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]"
      >
        ← 체인 · 프로젝트 서가
      </button>

      <section className="mt-5 grid gap-8 border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-6 md:grid-cols-[187px_minmax(0,1fr)]">
        {book.coverAsset ? (
          <Image
            src={book.coverAsset}
            alt={`${book.name} Cryptopedia 표지`}
            width={187}
            height={255}
            className="mx-auto h-auto w-[154px] outline outline-1 outline-white/10 md:w-[187px]"
          />
        ) : (
          <div className="flex aspect-[187/255] flex-col justify-between border border-[var(--editorial-line)] p-5">
            <p className="text-[10px] text-[var(--editorial-accent)]">
              VOL. {String(book.volume).padStart(2, "0")} / {book.type}
            </p>
            <p className="editorial-display text-[34px] leading-none">
              {book.name}
            </p>
            <p className="text-[10px] text-[var(--editorial-muted)]">CRYPTOPEDIA</p>
          </div>
        )}

        <div className="min-w-0">
          <p className="text-[11px] text-[var(--editorial-accent)]">
            {book.type} COLLECTION / VOL. {String(book.volume).padStart(2, "0")}
          </p>
          <h1 className="editorial-display mt-3 text-[44px] leading-[1.1] lg:text-[56px]">
            {book.name}
          </h1>
          <p className="mt-4 text-base">{book.description}</p>
          <p className="editorial-copy mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
            {book.readingGuide}
          </p>
          <p className="mt-4 text-xs text-[var(--editorial-muted)]">
            {book.contentStatus}
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[24px] font-normal leading-[1.55]">이 책의 목차</h2>
        <div className="mt-4">
          <ContentEntryList entries={book.chapters} onOpen={onOpenChapter} />
        </div>
      </section>

      <p className="mt-5 text-xs leading-5 text-[var(--editorial-muted)]">
        현재 목차는 Avalanche 공통 자료로 연결됩니다. 체인·프로젝트별 자료는
        수집 데이터 연결 후 구분됩니다.
      </p>
    </article>
  )
}
