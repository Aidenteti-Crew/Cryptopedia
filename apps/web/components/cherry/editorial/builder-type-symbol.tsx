import type { BuilderTypeId } from '@/lib/builder-test'

/* 빌더 유형 심볼 — 유형마다 다른 미니멀 선 도형. 캐릭터·일러스트가 아니라 같은 선 굵기의 기하학적 기호다.
   · maker     번개    — 실행
   · analyst   돋보기  — 원리를 들여다봄
   · architect 큐브    — 구조를 짜 맞춤
   · connector 노드    — 서로 이어짐
   장식이므로 aria-hidden. 색은 currentColor 를 따른다. */
const SYMBOLS: Record<BuilderTypeId, React.ReactNode> = {
  maker: <path d="M27 5 11 27h11l-2 16 17-23H26l1-15Z" />,
  analyst: (
    <>
      <circle cx="21" cy="21" r="12" />
      <path d="m30 30 12 12" />
    </>
  ),
  architect: (
    <>
      <path d="M24 5 40 14v20L24 43 8 34V14L24 5Z" />
      <path d="M8 14l16 9 16-9M24 23v20" />
    </>
  ),
  connector: (
    <>
      <circle cx="24" cy="10" r="5" />
      <circle cx="10" cy="36" r="5" />
      <circle cx="38" cy="36" r="5" />
      <path d="m21.5 14.5-9 17M26.5 14.5l9 17M15 36h18" />
    </>
  ),
}

export function BuilderTypeSymbol({ id, className = '' }: { id: BuilderTypeId; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-symbol={id}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {SYMBOLS[id]}
    </svg>
  )
}
