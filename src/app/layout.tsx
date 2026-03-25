import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Whale Play Baseball',
  description: 'Fantasy baseball weekly draft league',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full dark ${inter.variable}`}>
      <body className={`${inter.className} min-h-full bg-[#0a0a0a] text-[#fafafa]`}>
        {children}
      </body>
    </html>
  )
}
