'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const PRIORIDADE_COR: Record<string, { bg: string; cor: string }> = {
  URGENTE: { bg: '#FCE9E9', cor: '#B83232' },
  ALTA:    { bg: '#FEF3E2', cor: '#8A5A0A' },
  NORMAL:  { bg: '#F3F2EF', cor: '#6B6860' },
  BAIXA:   { bg: '#F3F2EF', cor: '#6B6860' },
}

interface Pedido {
  id: string
  numero: number
  descricao: string
  status: string
  prioridade: string
  prazoEntrega: string | null
  cliente: { nome: string }
}

interface Secao {
  status: 'AGUARDANDO' | 'EM_PRODUCAO'
  label: string
  cor: { bg: string; cor: string }
  acoes: { label: string; novoStatus: string; cor: string }[]
}

const SECOES: Secao[] = [
  {
    status: 'AGUARDANDO',
    label: 'Aguardando',
    cor: { bg: '#FEF3E2', cor: '#8A5A0A' },
    acoes: [
      { label: 'Iniciar Produção', novoStatus: 'EM_PRODUCAO', cor: 'var(--purple)' },
      { label: 'Cancelar', novoStatus: 'CANCELADO', cor: 'var(--red)' },
    ],
  },
  {
    status: 'EM_PRODUCAO',
    label: 'Em Produção',
    cor: { bg: '#EDE9FC', cor: '#4C3DB5' },
    acoes: [
      { label: 'Concluir', novoStatus: 'CONCLUIDO', cor: 'var(--green)' },
      { label: 'Pausar', novoStatus: 'PAUSADO', cor: 'var(--amber)' },
    ],
  },
]

export default function PaginaProducao() {
  const router = useRouter()
  const [pedidosAguardando, setPedidosAguardando] = useState<Pedido[]>([])
  const [pedidosEmProducao, setPedidosEmProducao] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [resAguardando, resProducao] = await Promise.all([
        fetch('/api/pedidos?status=AGUARDANDO&limite=100'),
        fetch('/api/pedidos?status=EM_PRODUCAO&limite=100'),
      ])
      if (resAguardando.ok) {
        const dados = await resAguardando.json()
        setPedidosAguardando(dados.pedidos ?? [])
      }
      if (resProducao.ok) {
        const dados = await resProducao.json()
        setPedidosEmProducao(dados.pedidos ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function mudarStatus(pedidoId: string, novoStatus: string) {
    setAtualizando(pedidoId)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) carregar()
    } finally {
      setAtualizando(null)
    }
  }

  const pedidosPorSecao: Record<string, Pedido[]> = {
    AGUARDANDO: pedidosAguardando,
    EM_PRODUCAO: pedidosEmProducao,
  }

  const total = pedidosAguardando.length + pedidosEmProducao.length

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
          Produção
        </h1>
        {!carregando && (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
            {pedidosAguardando.length} aguardando · {pedidosEmProducao.length} em produção
            {total === 0 && ' · Nenhum pedido ativo'}
          </p>
        )}
      </div>

      {carregando ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Carregando...
        </div>
      ) : total === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Nenhum pedido aguardando produção ou em andamento.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {SECOES.map(secao => {
            const lista = pedidosPorSecao[secao.status] ?? []
            return (
              <div key={secao.status}>
                {/* Título da seção */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{
                    padding: '3px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif', background: secao.cor.bg, color: secao.cor.cor,
                  }}>
                    {secao.label}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {lista.length} pedido{lista.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {lista.length === 0 ? (
                  <div style={{ padding: '20px 24px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                    Nenhum pedido nesta etapa.
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                          {['#', 'Cliente', 'Descrição', 'Prioridade', 'Prazo', 'Ações'].map(col => (
                            <th key={col} style={{
                              padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                              fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase',
                              letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                            }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map((p, i) => {
                          const pCor = PRIORIDADE_COR[p.prioridade] ?? PRIORIDADE_COR.NORMAL
                          const atrasado = p.prazoEntrega && new Date(p.prazoEntrega) < new Date()
                          const emAtualizacao = atualizando === p.id

                          return (
                            <tr
                              key={p.id}
                              style={{ borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none' }}
                            >
                              <td
                                onClick={() => router.push(`/dashboard/pedidos/${p.id}`)}
                                style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              >
                                #{String(p.numero).padStart(4, '0')}
                              </td>
                              <td
                                onClick={() => router.push(`/dashboard/pedidos/${p.id}`)}
                                style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
                              >
                                {p.cliente.nome}
                              </td>
                              <td
                                onClick={() => router.push(`/dashboard/pedidos/${p.id}`)}
                                style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', maxWidth: '260px', cursor: 'pointer' }}
                              >
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.descricao}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                                  fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                  background: pCor.bg, color: pCor.cor,
                                }}>
                                  {p.prioridade}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: atrasado ? 'var(--red)' : 'var(--text-secondary)' }}>
                                {p.prazoEntrega
                                  ? new Date(p.prazoEntrega).toLocaleDateString('pt-BR')
                                  : '—'}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {secao.acoes.map(acao => (
                                    <button
                                      key={acao.novoStatus}
                                      disabled={emAtualizacao}
                                      onClick={() => mudarStatus(p.id, acao.novoStatus)}
                                      style={{
                                        padding: '5px 12px', borderRadius: '6px', border: 'none',
                                        background: emAtualizacao ? 'var(--border)' : acao.cor,
                                        color: '#fff', fontSize: '12px', fontWeight: 600,
                                        cursor: emAtualizando ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {emAtualizacao ? '...' : acao.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
