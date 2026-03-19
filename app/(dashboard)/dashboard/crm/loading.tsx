export default function CarregandoCrm() {
  return (
    <div>
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '220px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '130px', height: '38px', borderRadius: '8px' }} />
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {['Prospecto', 'Negociação', 'Fechado', 'Perdido'].map((col) => (
          <div key={col} style={{ borderRadius: '10px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ width: '28px', height: '20px', borderRadius: '10px' }} />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                <div className="skeleton" style={{ width: '80px', height: '12px', borderRadius: '4px', marginBottom: '6px' }} />
                <div className="skeleton" style={{ width: '90px', height: '20px', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
