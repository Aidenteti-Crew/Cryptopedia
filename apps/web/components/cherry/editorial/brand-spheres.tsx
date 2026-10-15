/* 브랜드 장치 — 보라색 구체를 페이지 헤더(hero) 안에만 은은하게 둔다.
   UI 컴포넌트가 아니므로 장식(aria-hidden)이다.
   CSS 그라데이션으로는 무광 패브릭 질감과 구체 사이의 접촉 음영을 만들기 어려워
   별도 렌더링한 투명 WebP 에셋을 쓴다 (public/cryptopedia/assets/brand-spheres.webp, 1200×600).
   구체는 이미지 프레임 안에 모두 들어 있어(오른쪽만 화면 가장자리에서 잘림) 아래쪽이 어색하게 잘리지 않고,
   음영이 배경으로 녹는다. 헤더 높이에 맞춰 크기가 정해지며 헤더 박스 밖으로 나가지 않는다.
   왼쪽(텍스트 쪽)만 마스크로 배경색에 녹인다. 체인별 색은 섞지 않는다 — 항상 Chainery 브랜드 퍼플. */
export function BrandSpheres({
  className = '',
  scale = 1,
}: {
  className?: string
  /** 이미지 크기 비율 (기본 1). 홈 Hero 는 제목과의 균형을 위해 줄여서 쓴다. 오른쪽 정렬·가장자리 잘림은 유지된다. */
  scale?: number
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end overflow-hidden opacity-[0.5] [mask-image:linear-gradient(to_left,#000_55%,transparent_100%)] sm:opacity-[0.88] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 장식용 정적 에셋, 높이에 맞춰 스케일 */}
      <img
        src="/cryptopedia/assets/brand-spheres.webp"
        alt=""
        width={1200}
        height={600}
        decoding="async"
        className="w-auto max-w-none select-none"
        style={{ height: `${scale * 100}%` }}
      />
    </div>
  )
}
