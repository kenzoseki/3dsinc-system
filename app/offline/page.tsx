'use client'

export default function PaginaOffline() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F5F3EE', fontFamily: 'Inter, sans-serif', padding: '24px',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#2C2A26', fontFamily: 'Nunito, sans-serif', marginBottom: '8px' }}>
        Sem conexão
      </h1>
      <p style={{ fontSize: '14px', color: '#6B6860', textAlign: 'center', maxWidth: '320px' }}>
        Você está offline. Verifique sua conexão e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '24px', padding: '10px 24px', borderRadius: '8px',
          background: '#5B47C8', color: '#fff', border: 'none',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
