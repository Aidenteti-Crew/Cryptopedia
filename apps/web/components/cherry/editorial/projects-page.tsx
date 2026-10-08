import Image from "next/image"

import type { CollectionVolume } from "@/lib/cryptopedia-types"

interface ProjectsPageProps {
  volumes: CollectionVolume[]
  onOpenBook: (id: string) => void
}

function VolumeCard({
  volume,
  onOpen,
}: {
  volume: CollectionVolume
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(volume.href)}
      className="group flex min-h-[410px] w-full flex-col items-center justify-end px-6 pb-6 pt-8 text-left"
    >
      {volume.coverAsset ? (
        <Image
          src={volume.coverAsset}
          alt={`${volume.name} Cryptopedia 표지`}
          width={187}
          height={255}
          className="h-[255px] w-[187px] object-contain"
        />
      ) : null}
      <span className="mt-5 w-full max-w-[230px]">
        <span className="block text-base text-[var(--editorial-ink)]">
          {volume.name}
        </span>
        <span className="mt-2 block text-xs text-[var(--editorial-muted)]">
          {volume.type === "PROJECT" ? "프로젝트 · 기획 예시" : volume.networkType}
        </span>
        <span className="mt-3 block text-xs text-[var(--editorial-accent)] group-hover:text-[var(--editorial-ink)]">
          책 펼치기 ↗
        </span>
      </span>
    </button>
  )
}

export function ProjectsPage({ volumes, onOpenBook }: ProjectsPageProps) {
  const chains = volumes.filter((volume) => volume.type === "CHAIN")
  const projects = volumes.filter((volume) => volume.type === "PROJECT")

  return (
    <article className="px-6 py-6 sm:p-8 lg:p-[52px]">
      <p className="text-[11px] text-[var(--editorial-muted)]">
        THE LIVING LIBRARY / AVALANCHE
      </p>
      <h1 className="editorial-display mt-5 text-[44px] leading-[1.1] lg:text-[56px]">
        A world, bound in books.
      </h1>
      <p className="editorial-copy mt-5 max-w-3xl text-sm leading-6 text-[var(--editorial-muted)]">
        체인은 한 권의 백과사전, 프로젝트는 그 안에서 발견하는 또 하나의
        이야기.
      </p>

      <section className="mt-8 border-t border-[var(--editorial-line)] pt-6">
        <p className="text-[11px] text-[var(--editorial-accent)]">
          01 / CHAIN COLLECTION
        </p>
        <h2 className="mt-2 text-xl">체인 서가</h2>
        <p className="mt-1 text-sm text-[var(--editorial-muted)]">
          네트워크별로 연결된 지식과 생태계
        </p>
        <div className="mt-5 grid border-b-8 border-[var(--editorial-line)] bg-[var(--editorial-surface)] md:grid-cols-2 xl:grid-cols-3">
          {chains.map((volume) => (
            <VolumeCard key={volume.id} volume={volume} onOpen={onOpenBook} />
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--editorial-line)] pt-6">
        <p className="text-[11px] text-[var(--editorial-accent)]">
          02 / PROJECT COLLECTION
        </p>
        <h2 className="mt-2 text-xl">프로젝트 서가</h2>
        <p className="mt-1 text-sm text-[var(--editorial-muted)]">
          체인 위에서 만들어지는 서비스와 팀
        </p>
        <div className="mt-5 grid border-b-8 border-[var(--editorial-line)] bg-[var(--editorial-surface)] md:grid-cols-2">
          {projects.map((volume) => (
            <VolumeCard key={volume.id} volume={volume} onOpen={onOpenBook} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-[var(--editorial-muted)]">
        체인과 프로젝트를 구분한 디자인 미리보기 · 표지는 서비스용 편집
        디자인입니다.
      </p>
    </article>
  )
}
