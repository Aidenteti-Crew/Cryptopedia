/* 브랜드 장치 — 보라색 구체를 페이지 헤더(hero) 안에만 은은하게 깐다.
   UI 컴포넌트가 아니므로 장식(aria-hidden)이다. 글로우·외곽 그림자는 쓰지 않고,
   한 방향 광원(좌상단)의 명암만으로 입체감을 만든다:
   ① 본체 그라데이션  ② 좌상단 무광 하이라이트  ③ 우하단 음영(terminator)  ④ 패브릭 질감(grain)
   헤더 박스 밖으로는 나가지 않으며(overflow-hidden), 왼쪽(텍스트 쪽)은 마스크로 배경색에 녹인다. */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

interface Sphere {
  className: string
  lit: string
  mid: string
  dark: string
}

/* 크기는 hero 높이 기준(h-%), 비율은 aspect-square — 가로 비율을 쓰면 타원이 된다. */
const SPHERES: Sphere[] = [
  // 뒤쪽 작은 구체 — 깊이 장치
  { className: 'right-[36%] top-[40%] h-[62%]', lit: '#6B4B98', mid: '#402863', dark: '#1D1030' },
  // 위로 잘리는 큰 구체
  { className: '-top-[44%] right-[17%] h-[140%]', lit: '#8A6AB8', mid: '#593C86', dark: '#22133A' },
  // 오른쪽으로 잘리는 구체
  { className: 'top-[26%] -right-[8%] h-[100%]', lit: '#9A7BC5', mid: '#684A9C', dark: '#281840' },
]

export function BrandSpheres({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 right-0 overflow-hidden opacity-[0.5] [mask-image:linear-gradient(to_left,#000_40%,transparent_98%),linear-gradient(to_bottom,transparent_0%,#000_16%,#000_74%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-composite:source-in] sm:opacity-[0.72] ${className}`}
    >
      {SPHERES.map((sphere, index) => (
        <span
          key={index}
          className={`absolute aspect-square overflow-hidden rounded-full ${sphere.className}`}
          style={{
            background: [
              'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 30%)',
              'radial-gradient(circle at 80% 86%, rgba(10,4,18,0.62) 0%, rgba(10,4,18,0) 58%)',
              `radial-gradient(circle at 34% 28%, ${sphere.lit} 0%, ${sphere.mid} 48%, ${sphere.dark} 100%)`,
            ].join(', '),
          }}
        >
          <span
            className="absolute inset-0 mix-blend-overlay opacity-[0.32]"
            style={{ backgroundImage: GRAIN, backgroundSize: '200px 200px' }}
          />
        </span>
      ))}
    </div>
  )
}
