export default function CarregandoRelatorios() {
  return (
    <div>
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '240px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ padding: '20px 24px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: '90px', height: '12px', borderRadius: '4px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '70px', height: '28px', borderRadius: '6px', marginBottom: '6px' }} />
            <div className="skeleton" style={{ width: '110px', height: '12px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ width: '160px', height: '18px', borderRadius: '4px' }} />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '24px', padding: '14px 24px', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '60px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '130px', height: '14px', borderRadius: '4px', flex: 1 }} />
            <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: '5px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
