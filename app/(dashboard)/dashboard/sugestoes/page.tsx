'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

type Sugestao = {
  id: string
  tipo: 'MELHORIA' | 'BUG'
  titulo: string
  descricao: string
  imagemBase64: string | null
  status: 'PENDENTE' | 'EM_ANALISE' | 'IMPLEMENTADO' | 'DESCARTADO'
  createdAt: string
  usuario: { nome: string; cargo: string }
}

const STATUS_OPCOES = ['PENDENTE', 'EM_ANALISE', 'IMPLEMENTADO', 'DESCARTADO'] as const

const labelStatus: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  IMPLEMENTADO: 'Implementado',
  DESCARTADO: 'Descartado',
}

const corStatus: Record<string, { bg: string; text: string }> = {
  PENDENTE: { bg: '#FEF3E2', text: '#8A5A0A' },
  EM_ANALISE: { bg: '#EDE9FC', text: '#4C3DB5' },
  IMPLEMENTADO: { bg: '#E8F5EE', text: '#1A6B42' },
  DESCARTADO: { bg: '#F3F2EF', text: '#6B6860' },
}

const labelCargo: Record<string, string> = {
  ADMIN: 'Administrador',
  SOCIO: 'Sócio',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

export default function PaginaSugestoes() {
  const { data: session } = useSession()
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'MELHORIA' | 'BUG'>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [expandido, setExpandido] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/sugestoes')
      if (res.ok) {
        const dados = await res.json()
        setSugestoes(dados)
      }
    } catch {
      // silencioso
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function alterarStatus(id: string, novoStatus: string) {
    const res = await fetch(`/api/sugestoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    if (res.ok) {
      setSugestoes(prev => prev.map(s => s.id === id ? { ...s, status: novoStatus as Sugestao['status'] } : s))
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta sugestão permanentemente?')) return
    const res = await fetch(`/api/sugestoes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSugestoes(prev => prev.filter(s => s.id !== id))
      if (expandido === id) setExpandido(null)
    }
  }

  const cargo = session?.user?.cargo
  if (cargo && !['ADMIN', 'SOCIO'].includes(cargo)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
          Sem permissão para acessar esta página.
        </p>
      </div>
    )
  }

  const filtradas = sugestoes.filter(s => {
    if (filtroTipo !== 'TODOS' && s.tipo !== filtroTipo) return false
    if (filtroStatus !== 'TODOS' && s.status !== filtroStatus) return false
    return true
  })

  const contadores = {
    total: sugestoes.length,
    pendentes: sugestoes.filter(s => s.status === 'PENDENTE').length,
    emAnalise: sugestoes.filter(s => s.status === 'EM_ANALISE').length,
    melhorias: sugestoes.filter(s => s.tipo === 'MELHORIA').length,
    bugs: sugestoes.filter(s => s.tipo === 'BUG').length,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Sugestões e Bugs
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
          Visualize e gerencie as sugestões e relatos de bugs enviados pela equipe.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', valor: contadores.total, cor: 'var(--purple)' },
          { label: 'Pendentes', valor: contadores.pendentes, cor: '#8A5A0A' },
          { label: 'Em Análise', valor: contadores.emAnalise, cor: '#4C3DB5' },
          { label: 'Melhorias', valor: contadores.melhorias, cor: '#1A6B42' },
          { label: 'Bugs', valor: contadores.bugs, cor: '#B83232' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--bg-surface)', borderRadius: '12px', padding: '16px',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: kpi.cor }}>
              {kpi.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Tipo */}
        {(['TODOS', 'MELHORIA', 'BUG'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.12s',
              border: filtroTipo === t ? '1px solid var(--purple)' : '1px solid var(--border)',
              background: filtroTipo === t ? 'var(--purple-light)' : 'var(--bg-surface)',
              color: filtroTipo === t ? 'var(--purple-text)' : 'var(--text-secondary)',
            }}
          >
            {t === 'TODOS' ? 'Todos os tipos' : t === 'MELHORIA' ? '💡 Melhorias' : '🐛 Bugs'}
          </button>
        ))}

        <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

        {/* Status */}
        {['TODOS', ...STATUS_OPCOES].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.12s',
              border: filtroStatus === s ? '1px solid var(--purple)' : '1px solid var(--border)',
              background: filtroStatus === s ? 'var(--purple-light)' : 'var(--bg-surface)',
              color: filtroStatus === s ? 'var(--purple-text)' : 'var(--text-secondary)',
            }}
          >
            {s === 'TODOS' ? 'Todos os status' : labelStatus[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {carregando ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '40px 0' }}>
          Carregando...
        </p>
      ) : filtradas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            Nenhuma sugestão encontrada com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtradas.map(s => {
            const aberto = expandido === s.id
            const cor = corStatus[s.status]
            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--bg-surface)', borderRadius: '12px',
                  border: aberto ? '1px solid var(--purple)' : '1px solid var(--border)',
                  transition: 'border-color 0.15s',
                  overflow: 'hidden',
                }}
              >
                {/* Linha principal */}
                <div
                  onClick={() => setExpandido(aberto ? null : s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 18px', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>
                    {s.tipo === 'BUG' ? '🐛' : '💡'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                      fontFamily: 'Inter, sans-serif',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.titulo}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>
                      {s.usuario.nome} · {labelCargo[s.usuario.cargo] ?? s.usuario.cargo} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Badge status */}
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif', flexShrink: 0,
                    backgroundColor: cor.bg, color: cor.text,
                  }}>
                    {labelStatus[s.status]}
                  </span>

                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                    ▾
                  </span>
                </div>

                {/* Detalhes expandidos */}
                {aberto && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
                    <div style={{
                      marginTop: '14px', padding: '14px', borderRadius: '8px',
                      background: 'var(--bg-page)', fontSize: '13px', lineHeight: 1.6,
                      color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {s.descricao}
                    </div>

                    {s.imagemBase64 && (
                      <div style={{
                        marginTop: '10px', borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid var(--border)', background: 'var(--bg-page)',
                      }}>
                        <img
                          src={s.imagemBase64}
                          alt="Anexo da sugestão"
                          style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    )}

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginRight: '4px' }}>
                        Alterar status:
                      </span>
                      {STATUS_OPCOES.map(st => (
                        <button
                          key={st}
                          disabled={s.status === st}
                          onClick={() => alterarStatus(s.id, st)}
                          style={{
                            padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            fontFamily: 'Inter, sans-serif', cursor: s.status === st ? 'default' : 'pointer',
                            border: s.status === st ? `1px solid ${corStatus[st].text}` : '1px solid var(--border)',
                            background: s.status === st ? corStatus[st].bg : 'var(--bg-surface)',
                            color: s.status === st ? corStatus[st].text : 'var(--text-secondary)',
                            opacity: s.status === st ? 1 : 0.8,
                            transition: 'all 0.12s',
                          }}
                        >
                          {labelStatus[st]}
                        </button>
                      ))}

                      <div style={{ flex: 1 }} />

                      <button
                        onClick={() => excluir(s.id)}
                        style={{
                          padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                          fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                          border: '1px solid var(--border)', background: 'var(--bg-surface)',
                          color: 'var(--red)', transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--red-light)'
                          e.currentTarget.style.borderColor = 'var(--red)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--bg-surface)'
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
