export default function CarregandoEstoque() {
  return (
    <div>
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '180px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '160px', height: '38px', borderRadius: '8px' }} />
      </div>

      {/* Grid de cards de filamentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: '4px', marginBottom: '6px' }} />
                <div className="skeleton" style={{ width: '80px', height: '13px', borderRadius: '4px' }} />
              </div>
              <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: '8px', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ width: '70px', height: '13px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ width: '50px', height: '13px', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
