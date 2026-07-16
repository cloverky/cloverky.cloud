import type { Metadata } from 'next'
import { Noto_Sans_KR, Jua } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppShell } from '@/components/app-shell'
import { Providers } from '@/components/providers'
import './globals.css'

/** 본문 — 깔끔한 고딕 */
const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
})

/** 디스플레이 — 굵고 둥근 한국어 제목용 */
const jua = Jua({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-jua',
})

/** metadata 정리하기 */
export const metadata: Metadata = {
  title: 'FridgeAI - AI 냉장고 관리·맞춤 레시피',
  description: 'AI가 재고를 챙기고 취향에 맞는 레시피를 추천하는 냉장고 관리 서비스',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 테마 FOUC 방지 — CSS보다 먼저 실행되어 깜빡임 제거 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});})}`,
          }}
        />
      </head>
      <body
        className={`${notoSansKr.variable} ${jua.variable} font-sans antialiased bg-background`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
