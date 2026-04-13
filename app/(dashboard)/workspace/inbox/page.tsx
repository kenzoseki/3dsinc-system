'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Atividade {
  id: string
  acao: string
  entidade: string
  entidadeId: string | null
  titulo: string
  descricao: string | null
  lida: boolean
  createdAt: string
  usuario: { id: string; nome: string; avatarUrl: string | null } | null
}

interface Resposta {
  atividades: Atividade[]
  total: number
  naoLidas: number
}

const acaoLabel: Record<string, string> = {
  criou: 'criou',
  atualizou: 'atualizou',
  aprovou: 'aprovou',
  reprovou: 'reprovou',
  excluiu: 'excluiu',
  moveu: 'moveu',
  cancelou: 'cancelou',
  finalizou: 'finalizou',
  enviou: 'enviou',
  comentou: 'comentou',
  anexou: 'anexou',
}

const entidadeLabel: Record<string, string> = {
  Pedido: 'pedido',
  Orcamento: 'orçamento',
  Workspace: 'solicitação',
  Cliente: 'cliente',
  Lead: 'lead',
  CardMarketing: 'card de marketing',
  Filamento: 'filamento',
}

const entidadeCor: Record<string, string> = {
  Pedido:        'var(--purple)',
  Orcamento:     '#0E7490',
  Workspace:     '#8A5A0A',
  Cliente:       '#1A6B42',
  Lead:          '#4C3DB5',
  CardMarketing: '#B83232',
  Filamento:     '#6B6860',
}

function linkEntidade(atv: Atividade): string | null {
  if (!atv.entidadeId) return null
  switch (atv.entidade) {
    case 'Pedido':        return `/workspace/pedidos`
    case 'Orcamento':     return `/workspace/orcamentos/${atv.entidadeId}`
    case 'Workspace':     return `/workspace`
    case 'Cliente':       return `/workspace/clientes/${atv.entidadeId}`
    case 'Lead':          return `/workspace/crm`
    case 'CardMarketing': return `/workspace/marketing`
    default: return null
  }
}

function iniciais(nome: string) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatarHora(data: string) {
  const d = new Date(data)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarDataAgrupada(data: string) {
  const d = new Date(data)
  const hoje = new Date()
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
  const isMesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (isMesmoDia(d, hoje)) return 'Hoje'
  if (isMesmoDia(d, ontem)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).toUpperCase()
}

export default function InboxPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas'>('todas')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ limite: '100' })
      if (filtro === 'nao-lidas') params.set('naoLidas', 'true')
      const r = await fetch(`/api/atividades?${params}`)
      if (r.ok) {
        const d: Resposta = await r.json()
        setAtividades(d.atividades)
        setNaoLidas(d.naoLidas)
      }
    } finally { setCarregando(false) }
  }, [filtro])

  useEffect(() => { carregar() }, [carregar])

  async function marcarTodasLidas() {
    await fetch('/api/atividades', { method: 'PATCH' })
    carregar()
  }

  // Agrupa por dia
  const grupos = atividades.reduce<Record<string, Atividade[]>>((acc, atv) => {
    const chave = formatarDataAgrupada(atv.createdAt)
    ;(acc[chave] = acc[chave] ?? []).push(atv)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Cabeçalho */}
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Inbox
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            Registro de atividades e ações executadas no sistema
          </p>
        </div>
        {naoLidas > 0 && (
          <button
            onClick={marcarTodasLidas}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setFiltro('todas')}
          style={{
            padding: '6px 14px', borderRadius: '20px', border: '1px solid',
            borderColor: filtro === 'todas' ? 'var(--purple)' : 'var(--border)',
            background: filtro === 'todas' ? 'var(--purple-light)' : 'var(--bg-surface)',
            color: filtro === 'todas' ? 'var(--purple-text)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: filtro === 'todas' ? 600 : 400, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >Todas</button>
        <button
          onClick={() => setFiltro('nao-lidas')}
          style={{
            padding: '6px 14px', borderRadius: '20px', border: '1px solid',
            borderColor: filtro === 'nao-lidas' ? 'var(--purple)' : 'var(--border)',
            background: filtro === 'nao-lidas' ? 'var(--purple-light)' : 'var(--bg-surface)',
            color: filtro === 'nao-lidas' ? 'var(--purple-text)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: filtro === 'nao-lidas' ? 600 : 400, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Não lidas {naoLidas > 0 && <span style={{
            display: 'inline-block', marginLeft: '6px', background: 'var(--purple)', color: '#fff',
            borderRadius: '10px', padding: '0 6px', fontSize: '11px',
          }}>{naoLidas}</span>}
        </button>
      </div>

      {carregando ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '40px' }}>Carregando...</p>
      ) : atividades.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          backgroundColor: 'var(--bg-surface)', borderRadius: '12px',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📥</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', marginBottom: '6px' }}>
            {filtro === 'nao-lidas' ? 'Nenhuma atividade não lida' : 'Nenhuma atividade ainda'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            As ações realizadas no sistema aparecerão aqui
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '12px', overflow: 'hidden',
        }}>
          {Object.entries(grupos).map(([dia, lista]) => (
            <div key={dia}>
              <div style={{
                padding: '12px 20px 8px', fontSize: '11px', fontWeight: 700,
                color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.08em', borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--bg-page)',
              }}>
                {dia}
              </div>
              {lista.map((atv, i) => {
                const link = linkEntidade(atv)
                const corAcento = entidadeCor[atv.entidade] ?? 'var(--purple)'
                const conteudo = (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '14px 20px',
                    borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none',
                    background: atv.lida ? 'transparent' : 'rgba(91,71,200,0.03)',
                    transition: 'background 0.1s',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: corAcento, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                      flexShrink: 0, position: 'relative',
                    }}>
                      {atv.usuario ? iniciais(atv.usuario.nome) : '?'}
                      {!atv.lida && (
                        <span style={{
                          position: 'absolute', top: '-2px', right: '-2px',
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: 'var(--purple)', border: '2px solid var(--bg-surface)',
                        }} />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '13px', color: 'var(--text-primary)',
                        fontFamily: 'Inter, sans-serif', lineHeight: 1.5, margin: 0,
                      }}>
                        <strong style={{ fontWeight: 600 }}>{atv.usuario?.nome ?? 'Sistema'}</strong>
                        {' '}
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {acaoLabel[atv.acao] ?? atv.acao} {entidadeLabel[atv.entidade] ?? atv.entidade.toLowerCase()}
                        </span>
                      </p>
                      <p style={{
                        fontSize: '13px', color: 'var(--text-primary)',
                        fontFamily: 'Inter, sans-serif', margin: '2px 0 0',
                        fontWeight: 500,
                      }}>
                        {atv.titulo}
                      </p>
                      {atv.descricao && (
                        <p style={{
                          fontSize: '12px', color: 'var(--text-secondary)',
                          fontFamily: 'Inter, sans-serif', margin: '2px 0 0',
                        }}>
                          {atv.descricao}
                        </p>
                      )}
                    </div>

                    {/* Hora */}
                    <span style={{
                      fontSize: '11px', color: 'var(--text-secondary)',
                      fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
                    }}>
                      {formatarHora(atv.createdAt)}
                    </span>
                  </div>
                )
                return link ? (
                  <Link key={atv.id} href={link} prefetch={false}
                    style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    {conteudo}
                  </Link>
                ) : (
                  <div key={atv.id}>{conteudo}</div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
