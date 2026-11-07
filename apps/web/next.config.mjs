/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Version skew protection — 배포마다 다른 deploymentId 를 박아서
  // 옛 청크가 사라진 상황(404)에서 클라이언트가 자동으로 hard reload 하도록 함.
  // env로 안 받으면 빌드 타임 timestamp 폴백, 어쨌든 매 빌드 변함.
  // ref: https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || `build-${Date.now()}`,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // LEARN 주소에서 /chapters 를 뺐다 — 이미 공유된 옛 링크를 새 주소로 보낸다.
  // 메뉴를 옮긴 자료(예: 공식 문서)는 새 주소에서 한 번 더 제 메뉴로 넘겨준다 (learn-entry-page.tsx).
  async redirects() {
    return [
      { source: '/chapters/fundamentals/:path*', destination: '/concepts/:path*', permanent: true },
      { source: '/chapters/builders/:path*', destination: '/skills/:path*', permanent: true },
      { source: '/chapters/academy/:path*', destination: '/academy/:path*', permanent: true },
      // / 가 플랫폼 입구가 되며 예전 /about 랜딩은 / 로, 체인별 행사는 /knowledge/events 로 옮겼다
      // (/events 자체는 플랫폼 행사 페이지라 넘기지 않는다)
      { source: '/about', destination: '/', permanent: true },
      // 내 학습 경로는 아카데미 하위에서 컬렉션 밖 독립 화면으로 옮겼다
      { source: '/academy/my-path', destination: '/my-path', permanent: true },
      { source: '/events/:path+', destination: '/knowledge/events/:path+', permanent: true },
    ]
  },
  async headers() {
    // Turbopack이 매 배포마다 청크 파일명을 새로 뽑는데, 브라우저가 옛 HTML을
    // 휴리스틱 캐싱으로 오래 들고 있으면 사라진 옛 청크(_next/static/chunks/<oldhash>)를
    // 참조해 404 → CSS 일부가 비어서 레이아웃이 무너짐.
    // HTML/RSC 는 매번 ETag 검증, 정적 청크는 immutable 그대로.
    return [
      {
        source: '/((?!_next/static|_next/image|api|favicon).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
