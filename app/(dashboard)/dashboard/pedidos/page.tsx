'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Cliente {
  id: string
  nome: string
}

interface Pedido {
  id: string
  numero: number
  cliente: Cliente
  descricao: string
  status: string
  prioridade: string
  prazoEntrega: string | null
  valorTotal: string | null
  createdAt: string
}

const statusBadge: Record<string, { cor: string; fundo: string; label: string }> = {
  ORCAMENTO:   { cor: '#B83232', fundo: '#FCE9E9', label: 'Orçamento' },
  APROVADO:    { cor: '#8A5A0A', fundo: '#FEF3E2', label: 'Aprovado' },
  EM_PRODUCAO: { cor: '#4C3DB5', fundo: '#EDE9FC', label: 'Em Produção' },
  PAUSADO:     { cor: '#B83232', fundo: '#FCE9E9', label: 'Pausado' },
  CONCLUIDO:   { cor: '#1A6B42', fundo: '#E8F5EE', label: 'Concluído' },
  ENTREGUE:    { cor: '#1A6B42', fundo: '#E8F5EE', label: 'Entregue' },
  CANCELADO:   { cor: '#6B6860', fundo: '#F3F2EF', label: 'Cancelado' },
}

const prioridadeCor: Record<string, string> = {
  BAIXA: 'var(--text-secondary)',
  NORMAL: 'var(--text-primary)',
  ALTA: 'var(--amber)',
  URGENTE: 'var(--red)',
}

export default function PaginaPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const carregarPedidos = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ pagina: String(paginaAtual), limite: '20' })
      if (filtroStatus) params.set('status', filtroStatus)

      const resposta = await fetch(`/api/pedidos?${params}`)
      const dados = await resposta.json()

      if (resposta.ok) {
        setPedidos(dados.pedidos)
        setTotalPaginas(dados.paginacao.totalPaginas)
      }
    } catch (erro) {
      console.error('Erro ao carregar pedidos:', erro)
    } finally {
      setCarregando(false)
    }
  }, [paginaAtual, filtroStatus])

  useEffect(() => {
    carregarPedidos()
  }, [carregarPedidos])

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
            Pedidos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
            Gerencie todos os pedidos
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/novo"
          style={{
            padding: '9px 16px',
            backgroundColor: 'var(--purple)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Nunito, sans-serif',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--purple-dark)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--purple)' }}
        >
          + Novo Pedido
        </Link>
      </div>

      {/* Filtros de status */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => { setFiltroStatus(''); setPaginaAtual(1) }}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            border: `1px solid ${filtroStatus === '' ? 'var(--purple)' : 'var(--border)'}`,
            backgroundColor: filtroStatus === '' ? 'var(--purple-light)' : 'transparent',
            color: filtroStatus === '' ? 'var(--purple-text)' : 'var(--text-secondary)',
            transition: 'all 0.12s',
          }}
        >
          Todos
        </button>
        {Object.entries(statusBadge).map(([status, { label }]) => (
          <button
            key={status}
            onClick={() => { setFiltroStatus(status); setPaginaAtual(1) }}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              border: `1px solid ${filtroStatus === status ? 'var(--purple)' : 'var(--border)'}`,
              backgroundColor: filtroStatus === status ? 'var(--purple-light)' : 'transparent',
              color: filtroStatus === status ? 'var(--purple-text)' : 'var(--text-secondary)',
              transition: 'all 0.12s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                {['#', 'Cliente', 'Descrição', 'Status', 'Prioridade', 'Prazo', 'Valor'].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: '10px 20px',
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                    Carregando pedidos...
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => {
                  const badge = statusBadge[pedido.status] ?? { cor: '#6B6860', fundo: '#F3F2EF', label: pedido.status }
                  const corPrioridade = prioridadeCor[pedido.prioridade] ?? 'var(--text-primary)'
                  const prazoData = pedido.prazoEntrega ? new Date(pedido.prazoEntrega) : null
                  const atrasado = prazoData && prazoData < new Date() && !['ENTREGUE', 'CANCELADO', 'CONCLUIDO'].includes(pedido.status)

                  return (
                    <tr
                      key={pedido.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => window.location.href = `/dashboard/pedidos/${pedido.id}`}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent' }}
                    >
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        #{pedido.numero}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                        {pedido.cliente.nome}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pedido.descricao}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                          color: badge.cor,
                          backgroundColor: badge.fundo,
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 500, color: corPrioridade, fontFamily: 'Inter, sans-serif' }}>
                        {pedido.prioridade}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: atrasado ? 'var(--red)' : 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                        {prazoData ? prazoData.toLocaleDateString('pt-BR') : '—'}
                        {atrasado && <span style={{ marginLeft: '4px', fontSize: '11px' }}>(atrasado)</span>}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {pedido.valorTotal
                          ? `R$ ${parseFloat(pedido.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              style={{
                color: paginaAtual === 1 ? 'var(--text-secondary)' : 'var(--purple)',
                cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                background: 'none',
                border: 'none',
              }}
            >
              ← Anterior
            </button>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
              Página {paginaAtual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              style={{
                color: paginaAtual === totalPaginas ? 'var(--text-secondary)' : 'var(--purple)',
                cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                background: 'none',
                border: 'none',
              }}
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
