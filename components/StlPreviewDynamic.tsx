import dynamic from 'next/dynamic'

const StlPreview = dynamic(() => import('./StlPreview'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <p style={{ color: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
        Carregando visualizador 3D...
      </p>
    </div>
  ),
})

export default StlPreview
