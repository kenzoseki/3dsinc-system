'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'

interface HistoricoItem {
  id: string
  status: string
  nota: string | null
  createdAt: string
  usuario: { nome: string } | null
}

interface ItemPedido {
  id: string
  descricao: string
  quantidade: number
  pesoGramas: string | null
  tempoHoras: string | null
  valorUnitario: string | null
  filamento: { marca: string; cor: string; material: string } | null
}

interface PedidoDetalhe {
  id: string
  numero: number
  descricao: string
  status: string
  prioridade: string
  prazoEntrega: string | null
  valorTotal: string | null
  observacoes: string | null
  createdAt: string
  cliente: { id: string; nome: string; email: string | null; telefone: string | null }
  itens: ItemPedido[]
  historico: HistoricoItem[]
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

const proximosStatus: Record<string, string[]> = {
  ORCAMENTO: ['APROVADO', 'CANCELADO'],
  APROVADO: ['EM_PRODUCAO', 'CANCELADO'],
  EM_PRODUCAO: ['PAUSADO', 'CONCLUIDO'],
  PAUSADO: ['EM_PRODUCAO', 'CANCELADO'],
  CONCLUIDO: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
}

const estiloCard: React.CSSProperties = {
  padding: '20px 24px',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

export default function PaginaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [alterandoStatus, setAlterandoStatus] = useState(false)

  const cargo = session?.user?.cargo as Cargo | undefined
  const podeEditar = cargo ? Permissoes.podeEscreverPedidos(cargo) : false

  useEffect(() => {
    async function carregarPedido() {
      try {
        const resposta = await fetch(`/api/pedidos/${id}`)
        if (resposta.ok) {
          const dados = await resposta.json()
          setPedido(dados)
        } else if (resposta.status === 404) {
          router.push('/dashboard/pedidos')
        }
      } catch (erro) {
        console.error('Erro ao carregar pedido:', erro)
      } finally {
        setCarregando(false)
      }
    }
    carregarPedido()
  }, [id, router])

  async function mudarStatus(novoStatus: string) {
    if (!pedido || !podeEditar) return
    setAlterandoStatus(true)

    try {
      const resposta = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })

      if (resposta.ok) {
        const dados = await resposta.json()
        setPedido(dados)
      }
    } catch (erro) {
      console.error('Erro ao alterar status:', erro)
    } finally {
      setAlterandoStatus(false)
    }
  }

  if (carregando) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
        Carregando pedido...
      </div>
    )
  }

  if (!pedido) return null

  const badge = statusBadge[pedido.status] ?? { cor: '#6B6860', fundo: '#F3F2EF', label: pedido.status }
  const acoesPossiveis = proximosStatus[pedido.status] ?? []

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{ color: 'var(--purple)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '8px', padding: 0 }}
          >
            ← Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace' }}>#{pedido.numero}</span>
            </h1>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              color: badge.cor,
              backgroundColor: badge.fundo,
            }}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Ações de status */}
        {podeEditar && acoesPossiveis.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {acoesPossiveis.map((status) => {
              const b = statusBadge[status]
              const ehCancelamento = status === 'CANCELADO'
              return (
                <button
                  key={status}
                  onClick={() => mudarStatus(status)}
                  disabled={alterandoStatus}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    cursor: alterandoStatus ? 'not-allowed' : 'pointer',
                    opacity: alterandoStatus ? 0.5 : 1,
                    backgroundColor: ehCancelamento ? 'var(--red-light)' : 'var(--purple-light)',
                    color: ehCancelamento ? 'var(--red)' : 'var(--purple-text)',
                    border: `1px solid ${ehCancelamento ? 'var(--red-light)' : 'var(--purple-light)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  → {b?.label ?? status}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Info principal */}
        <div style={estiloCard}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Informações do Pedido
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Descrição</p>
              <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>{pedido.descricao}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Prioridade</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>{pedido.prioridade}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Prazo</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {pedido.prazoEntrega ? new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Valor Total</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {pedido.valorTotal
                    ? `R$ ${parseFloat(pedido.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Criado em</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {new Date(pedido.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {pedido.observacoes && (
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Observações</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontSize: '14px' }}>{pedido.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div style={estiloCard}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Cliente
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Nome</p>
              <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontSize: '14px' }}>{pedido.cliente.nome}</p>
            </div>
            {pedido.cliente.email && (
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Email</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontSize: '13px' }}>{pedido.cliente.email}</p>
              </div>
            )}
            {pedido.cliente.telefone && (
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Telefone</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontSize: '13px' }}>{pedido.cliente.telefone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Itens do pedido */}
      {pedido.itens.length > 0 && (
        <div style={{ ...estiloCard, marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Itens do Pedido
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Descrição', 'Filamento', 'Qtd', 'Peso (g)', 'Tempo (h)', 'Valor Unit.'].map(col => (
                  <th key={col} style={{ textAlign: 'left', paddingBottom: '10px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' }}>{item.descricao}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
                    {item.filamento ? `${item.filamento.marca} ${item.filamento.material} ${item.filamento.cor}` : '—'}
                  </td>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{item.quantidade}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{item.pesoGramas ?? '—'}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{item.tempoHoras ?? '—'}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                    {item.valorUnitario ? `R$ ${parseFloat(item.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Histórico */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Histórico de Status
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pedido.historico.map((h) => {
            const b = statusBadge[h.status]
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: b?.cor ?? 'var(--text-secondary)',
                  marginTop: '5px', flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: b?.cor ?? 'var(--text-secondary)' }}>
                      {b?.label ?? h.status}
                    </span>
                    {h.usuario && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                        por {h.usuario.nome}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', opacity: 0.7 }}>
                      {new Date(h.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {h.nota && (
                    <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                      {h.nota}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
