'use client'

export function EmBreve({ titulo, descricao, icone }: { titulo: string; descricao: string; icone?: string }) {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{
        fontSize: '48px', marginBottom: '16px', opacity: 0.6,
      }} aria-hidden="true">{icone ?? '🛠️'}</div>
      <h1 style={{
        fontFamily: 'Nunito, sans-serif', fontSize: '24px', fontWeight: 700,
        color: 'var(--text-primary)', margin: '0 0 8px',
      }}>
        {titulo}
      </h1>
      <p style={{
        fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif',
        lineHeight: 1.6, margin: 0,
      }}>
        {descricao}
      </p>
      <div style={{
        display: 'inline-block', marginTop: '20px', padding: '6px 14px',
        background: 'var(--purple-light)', color: 'var(--purple-text)',
        fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 600,
        borderRadius: '999px', letterSpacing: '0.04em',
      }}>
        EM BREVE
      </div>
    </div>
  )
}
