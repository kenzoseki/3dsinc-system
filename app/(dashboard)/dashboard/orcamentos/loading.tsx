export default function CarregandoOrcamentos() {
  return (
    <div>
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div className="skeleton" style={{ width: '140px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '220px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '160px', height: '38px', borderRadius: '8px' }} />
      </div>

      {/* Filtros de status */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[70, 80, 90, 90, 100, 90].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}px`, height: '32px', borderRadius: '20px' }} />
        ))}
      </div>

      {/* Tabela */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
          {[100, 150, 120, 100, 90, 80].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}px`, height: '12px', borderRadius: '4px' }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '14px 24px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '150px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '90px', height: '22px', borderRadius: '5px' }} />
            <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
