export default function CarregandoPedidos() {
  return (
    <div>
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '200px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '140px', height: '38px', borderRadius: '8px' }} />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[180, 120, 100, 140, 110].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}px`, height: '36px', borderRadius: '8px' }} />
        ))}
      </div>

      {/* Tabela */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
          {[60, 120, 80, 200, 90, 100].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}px`, height: '12px', borderRadius: '4px' }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '14px 24px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '60px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '200px', height: '14px', borderRadius: '4px', flex: 1 }} />
            <div className="skeleton" style={{ width: '90px', height: '22px', borderRadius: '5px' }} />
            <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Paginação */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
        ))}
      </div>
    </div>
  )
}
