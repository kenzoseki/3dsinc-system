export default function CarregandoClientes() {
  return (
    <div>
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div className="skeleton" style={{ width: '110px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '190px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '150px', height: '38px', borderRadius: '8px' }} />
      </div>

      {/* Busca */}
      <div className="skeleton" style={{ width: '320px', height: '38px', borderRadius: '8px', marginBottom: '20px' }} />

      {/* Tabela */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
          {[140, 120, 160, 120, 80, 70].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}px`, height: '12px', borderRadius: '4px' }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '14px 24px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '140px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '160px', height: '14px', borderRadius: '4px', flex: 1 }} />
            <div className="skeleton" style={{ width: '110px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '40px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '64px', height: '28px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
