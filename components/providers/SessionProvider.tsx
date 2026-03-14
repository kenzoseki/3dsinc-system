'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface ProvedorSessaoProps {
  children: ReactNode
}

export default function ProvedorSessao({ children }: ProvedorSessaoProps) {
  return <SessionProvider>{children}</SessionProvider>
}
