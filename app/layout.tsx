import type { Metadata, Viewport } from 'next'
import './globals.css'
import ProvedorSessao from '@/components/providers/SessionProvider'
import PwaRegistrar from '@/components/providers/PwaRegistrar'

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
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <ProvedorSessao>{children}</ProvedorSessao>
        <PwaRegistrar />
      </body>
    </html>
  )
}
