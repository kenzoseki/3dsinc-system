import type { Metadata } from 'next'
import './globals.css'
import ProvedorSessao from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: '3D Sinc — Sistema de Gestão',
  description: 'ERP integrado com IA para impressão 3D por encomenda',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorSessao>{children}</ProvedorSessao>
      </body>
    </html>
  )
}
