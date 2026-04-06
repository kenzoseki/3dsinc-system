export default function CarregandoDashboard() {
  return (
    <div>
      {/* Cabeçalho skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div className="skeleton" style={{ width: '160px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '200px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '280px', height: '36px', borderRadius: '8px' }} />
      </div>

      {/* Cards de métricas skeleton */}
      <div className="grid-metricas" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ padding: '20px 24px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: '100px', height: '12px', borderRadius: '4px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '80px', height: '32px', borderRadius: '6px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '120px', height: '12px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Gráficos skeleton — linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {[0, 1].map(i => (
          <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '10px' }} />
        ))}
      </div>

      {/* Gráficos skeleton — linha 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {[0, 1].map(i => (
          <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '10px' }} />
        ))}
      </div>

      {/* Tabelas skeleton */}
      {[0, 1].map(t => (
        <div key={t} style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', marginBottom: '20px' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ width: '140px', height: '18px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '70px', height: '16px', borderRadius: '4px' }} />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', padding: '14px 24px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div className="skeleton" style={{ width: '48px', height: '14px', borderRadius: '4px', flexShrink: 0 }} />
              <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ width: '160px', height: '14px', borderRadius: '4px', flex: 1 }} />
              <div className="skeleton" style={{ width: '72px', height: '22px', borderRadius: '5px' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
