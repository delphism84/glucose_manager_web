import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'EMPECS CGMS Admin',
  description: '혈당 측정 기기·회원·데이터 관리'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='ko' className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-[#f4f6fb] text-slate-900 antialiased`}>{children}</body>
    </html>
  )
}
