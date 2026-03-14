'use client'

import { useSession } from 'next-auth/react'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PaginaEquipe() {
  const { data: session } = useSession()
  const router = useRouter()

  const cargo = session?.user?.cargo as Cargo | undefined

  useEffect(() => {
    if (cargo && !Permissoes.podeVerEquipe(cargo)) {
      router.push('/dashboard')
    }
  }, [cargo, router])

  if (!cargo || !Permissoes.podeVerEquipe(cargo)) return null

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Equipe
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Gerenciamento de membros da equipe
        </p>
      </div>

      <div style={{
        padding: '48px',
        borderRadius: '10px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Gerenciamento de equipe
        </p>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
          Esta funcionalidade será implementada na próxima versão
        </p>
      </div>
    </div>
  )
}
