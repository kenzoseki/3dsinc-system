import type { Metadata, Viewport } from 'next'
import './globals.css'
import './responsive.css'
import ProvedorSessao from '@/components/providers/SessionProvider'
import PwaRegistrar from '@/components/providers/PwaRegistrar'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: '3D Sinc — Sistema de Gestão',
  description: 'ERP integrado com IA para impressão 3D por encomenda',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '3D Sinc',
  },
}

export const viewport: Viewport = {
  themeColor: '#5B47C8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <ProvedorSessao>{children}</ProvedorSessao>
        <PwaRegistrar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
