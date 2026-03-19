'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'

interface Config {
  nomeEmpresa: string
  cnpj: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  logoBase64: string | null
  alertaEstoqueBaixo: boolean
  alertaPedidoAtrasado: boolean
  alertaEmailHabilitado: boolean
  emailAlertas: string | null
}

const estiloCard: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '28px 32px',
  marginBottom: '20px',
}

const estiloLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  fontFamily: 'Inter, sans-serif',
}

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-page)',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)',
}

const estiloGrupo: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '16px',
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const [config, setConfig] = useState<Config | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const inputLogoRef = useRef<HTMLInputElement>(null)

  const isAdmin = session?.user.cargo === 'ADMIN'

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then(setConfig)
  }, [])

  async function salvar(dados: Partial<Config>) {
    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      if (res.ok) {
        const novo = await res.json()
        setConfig(novo)
        setMensagem('Salvo com sucesso!')
        setTimeout(() => setMensagem(''), 3000)
      } else {
        setMensagem('Erro ao salvar.')
      }
    } finally {
      setSalvando(false)
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('Imagem muito grande. Máximo 500 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setConfig(c => c ? { ...c, logoBase64: base64 } : c)
      salvar({ logoBase64: base64 })
    }
    reader.readAsDataURL(file)
  }

  function removerLogo() {
    setConfig(c => c ? { ...c, logoBase64: null } : c)
    salvar({ logoBase64: null })
  }

  if (!config) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 0 40px' }}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        Configurações
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '28px' }}>
        {isAdmin ? 'Gerencie as configurações da empresa e notificações.' : 'Visualize as configurações da empresa.'}
      </p>

      {mensagem && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '20px',
          backgroundColor: mensagem.includes('Erro') ? 'var(--red-light)' : 'var(--green-light)',
          color: mensagem.includes('Erro') ? 'var(--red)' : 'var(--green)',
          fontSize: '13px', fontFamily: 'Inter, sans-serif',
        }}>{mensagem}</div>
      )}

      {/* Logo da empresa */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Logo da empresa
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            width: '120px', height: '60px', borderRadius: '10px',
            border: '2px dashed var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--bg-page)', overflow: 'hidden', flexShrink: 0,
          }}>
            {config.logoBase64 ? (
              <img src={config.logoBase64} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '4px' }}>
                Sem logo
              </span>
            )}
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input ref={inputLogoRef} type="file" accept="image/png,image/svg+xml,image/jpeg" style={{ display: 'none' }} onChange={handleLogoUpload} />
              <button
                onClick={() => inputLogoRef.current?.click()}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', fontWeight: 500,
                  backgroundColor: 'var(--purple)', color: '#fff', border: 'none',
                }}
              >
                {config.logoBase64 ? 'Alterar logo' : 'Enviar logo'}
              </button>
              {config.logoBase64 && (
                <button
                  onClick={removerLogo}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                    fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                    backgroundColor: 'transparent', color: 'var(--red)',
                    border: '1px solid var(--red-light)',
                  }}
                >
                  Remover
                </button>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                PNG com fundo transparente · máx. 500 KB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dados da empresa */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Dados da empresa
        </h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Nome da empresa</label>
          <input
            style={estiloInput}
            value={config.nomeEmpresa}
            onChange={e => setConfig(c => c ? { ...c, nomeEmpresa: e.target.value } : c)}
            disabled={!isAdmin}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>
        <div style={estiloGrupo}>
          <div>
            <label style={estiloLabel}>CNPJ</label>
            <input style={estiloInput} value={config.cnpj ?? ''} onChange={e => setConfig(c => c ? { ...c, cnpj: e.target.value || null } : c)} disabled={!isAdmin}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Telefone</label>
            <input style={estiloInput} value={config.telefone ?? ''} onChange={e => setConfig(c => c ? { ...c, telefone: e.target.value || null } : c)} disabled={!isAdmin}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>E-mail</label>
          <input style={estiloInput} type="email" value={config.email ?? ''} onChange={e => setConfig(c => c ? { ...c, email: e.target.value || null } : c)} disabled={!isAdmin}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Endereço</label>
          <input style={estiloInput} value={config.endereco ?? ''} onChange={e => setConfig(c => c ? { ...c, endereco: e.target.value || null } : c)} disabled={!isAdmin}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <div style={estiloGrupo}>
          <div>
            <label style={estiloLabel}>Cidade</label>
            <input style={estiloInput} value={config.cidade ?? ''} onChange={e => setConfig(c => c ? { ...c, cidade: e.target.value || null } : c)} disabled={!isAdmin}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Estado</label>
            <input style={estiloInput} value={config.estado ?? ''} onChange={e => setConfig(c => c ? { ...c, estado: e.target.value || null } : c)} disabled={!isAdmin}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => salvar({
              nomeEmpresa: config.nomeEmpresa,
              cnpj: config.cnpj, email: config.email, telefone: config.telefone,
              endereco: config.endereco, cidade: config.cidade, estado: config.estado,
            })}
            disabled={salvando}
            style={{
              marginTop: '4px', padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
              fontFamily: 'Inter, sans-serif', cursor: salvando ? 'not-allowed' : 'pointer',
              fontWeight: 500, backgroundColor: 'var(--purple)', color: '#fff', border: 'none',
              opacity: salvando ? 0.7 : 1,
            }}
          >
            {salvando ? 'Salvando...' : 'Salvar dados'}
          </button>
        )}
      </div>

      {/* Notificações */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
          Notificações
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '24px' }}>
          Configure quais alertas devem ser gerados pelo sistema.
          {!isAdmin && ' Somente ADMIN pode alterar estas configurações.'}
        </p>

        {[
          { campo: 'alertaEstoqueBaixo' as const, titulo: 'Alerta de estoque baixo', descricao: 'Notifica quando filamentos atingem menos de 20% de capacidade.' },
          { campo: 'alertaPedidoAtrasado' as const, titulo: 'Alerta de pedido atrasado', descricao: 'Notifica quando pedidos ultrapassam o prazo de entrega sem estar concluídos.' },
          { campo: 'alertaEmailHabilitado' as const, titulo: 'Envio de alertas por e-mail', descricao: 'Envia notificações por e-mail diariamente (requer Resend configurado).' },
        ].map(({ campo, titulo, descricao }) => (
          <div key={campo} style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', paddingBottom: '20px', marginBottom: '20px',
            borderBottom: campo !== 'alertaEmailHabilitado' ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>{titulo}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{descricao}</p>
            </div>
            <button
              onClick={() => {
                if (!isAdmin) return
                const novo = { ...config, [campo]: !config[campo] }
                setConfig(novo)
                salvar({ [campo]: !config[campo] })
              }}
              disabled={!isAdmin}
              style={{
                flexShrink: 0, width: '44px', height: '24px',
                borderRadius: '12px', border: 'none',
                backgroundColor: config[campo] ? 'var(--purple)' : 'var(--border-strong)',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                position: 'relative', transition: 'background-color 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: config[campo] ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>
        ))}

        {/* E-mail de destino dos alertas */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '4px' }}>
          <label style={estiloLabel}>E-mail para receber alertas</label>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '10px' }}>
            Se preenchido, os alertas serão enviados para este endereço. Caso vazio, será usado o e-mail da empresa.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              style={{ ...estiloInput, flex: 1 }}
              type="email"
              placeholder="alertas@exemplo.com.br"
              value={config.emailAlertas ?? ''}
              onChange={e => setConfig(c => c ? { ...c, emailAlertas: e.target.value || null } : c)}
              disabled={!isAdmin}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {isAdmin && (
              <button
                onClick={() => salvar({ emailAlertas: config.emailAlertas })}
                disabled={salvando}
                style={{
                  padding: '9px 16px', borderRadius: '8px', fontSize: '13px',
                  fontFamily: 'Inter, sans-serif', cursor: salvando ? 'not-allowed' : 'pointer',
                  fontWeight: 500, backgroundColor: 'var(--purple)', color: '#fff', border: 'none',
                  opacity: salvando ? 0.7 : 1, whiteSpace: 'nowrap',
                }}
              >
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
