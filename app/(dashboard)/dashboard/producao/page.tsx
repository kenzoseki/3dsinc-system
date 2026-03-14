export default function PaginaProducao() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Produção
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Módulo de produção — em desenvolvimento (Fase 2)
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
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
          Em desenvolvimento
        </p>
      </div>
    </div>
  )
}
