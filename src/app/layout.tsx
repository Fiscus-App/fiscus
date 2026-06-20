import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fiscus — Australian Financial Intelligence',
  description:
    'Bloomberg-quality AI briefings for ASX news, RBA decisions, and market data. Built for analysts, consultants, and investors.',
  keywords: [
    'ASX', 'Australian financial news', 'market intelligence',
    'RBA', 'financial briefings', 'investment research',
  ],
  openGraph: {
    title: 'Fiscus — Australian Financial Intelligence',
    description: '15-second AI briefings from trusted Australian financial sources.',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Fiscus',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#07091a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jakarta.variable} ${mono.variable}`}
    >
      <body className="bg-bg text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
