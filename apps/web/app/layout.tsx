import type { Metadata } from 'next'
import { Cormorant, Inter, Noto_Sans_KR, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-rounded',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

const cormorant = Cormorant({
  subsets: ['latin'],
  variable: '--font-editorial-display',
  display: 'swap',
  weight: '400',
})

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-editorial-body',
  display: 'swap',
  weight: ['400', '500'],
})

/* 서비스 이름은 chainery 로 통일 — 각 페이지는 자기 제목만 주고 " | chainery" 는 템플릿이 붙인다 */
export const metadata: Metadata = {
  title: {
    default: 'chainery',
    template: '%s | chainery',
  },
  description: '모든 체인의 이야기가 모이는 곳, 체이너리.',
  /* 파비콘 전용 정사각형 이미지 — 헤더 로고 아이콘처럼 연라벤더 배경 위 로고.
     /favicon.ico(public)는 링크를 안 읽는 브라우저용 기본 요청에 응답한다. */
  icons: {
    icon: { url: '/cryptopedia/assets/chainery-icon.png', type: 'image/png', sizes: '512x512' },
    apple: { url: '/cryptopedia/assets/chainery-apple-icon.png', sizes: '180x180' },
  },
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} ${cormorant.variable} ${notoSansKr.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
