'use client'

import { useSession } from 'next-auth/react'

const labelCargo: Record<string, string> = {
  ADMIN: 'Administrador',
  SOCIO: 'Sócio',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

export default function PaginaPerfil() {
  const { data: session } = useSession()
  const usuario = session?.user

  if (!usuario) return null

  const iniciais = usuario.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Meu Perfil
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Informações da sua conta
        </p>
      </div>

      <div style={{
        padding: '28px',
        borderRadius: '10px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Avatar e nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: 'var(--purple)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', flexShrink: 0,
          }}>
            {iniciais}
          </div>
          <div>
            <p style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-primary)' }}>
              {usuario.nome}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px', marginTop: '2px' }}>
              {usuario.email}
            </p>
            <span style={{
              display: 'inline-block',
              marginTop: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              backgroundColor: 'var(--purple-light)',
              color: 'var(--purple-text)',
            }}>
              {labelCargo[usuario.cargo] ?? usuario.cargo}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Nome
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>{usuario.nome}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Email
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>{usuario.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Cargo
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>
              {labelCargo[usuario.cargo] ?? usuario.cargo}
            </p>
          </div>
        </div>

        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', opacity: 0.7 }}>
          Edição de perfil será implementada na Fase 2
        </p>
      </div>
    </div>
  )
}
