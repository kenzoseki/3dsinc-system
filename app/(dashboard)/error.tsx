'use client'

import { useEffect } from 'react'

export default function ErroLayout({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        backgroundColor: 'var(--red-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', marginBottom: '4px',
      }}>⚠</div>
      <h2 style={{
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 700,
        fontSize: '18px',
        color: 'var(--text-primary)',
      }}>
        Algo deu errado
      </h2>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        maxWidth: '360px',
      }}>
        {error.message || 'Ocorreu um erro inesperado ao carregar esta página.'}
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
        style={{ marginTop: '8px', padding: '9px 20px' }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
