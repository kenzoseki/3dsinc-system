import { prisma } from '@/lib/db'
import Link from 'next/link'

function formatarStatus(status: string): string {
  const mapa: Record<string, string> = {
    ORCAMENTO: 'Orçamento',
    APROVADO: 'Aprovado',
    EM_PRODUCAO: 'Em Produção',
    PAUSADO: 'Pausado',
    CONCLUIDO: 'Concluído',
    ENTREGUE: 'Entregue',
    CANCELADO: 'Cancelado',
  }
  return mapa[status] ?? status
}

function corStatus(status: string): { cor: string; fundo: string } {
  const mapa: Record<string, { cor: string; fundo: string }> = {
    EM_PRODUCAO: { cor: '#4C3DB5', fundo: '#EDE9FC' },
    ORCAMENTO:   { cor: '#B83232', fundo: '#FCE9E9' },
    PAUSADO:     { cor: '#B83232', fundo: '#FCE9E9' },
    CONCLUIDO:   { cor: '#1A6B42', fundo: '#E8F5EE' },
    ENTREGUE:    { cor: '#1A6B42', fundo: '#E8F5EE' },
    APROVADO:    { cor: '#8A5A0A', fundo: '#FEF3E2' },
    CANCELADO:   { cor: '#6B6860', fundo: '#F3F2EF' },
  }
  return mapa[status] ?? { cor: '#6B6860', fundo: '#F3F2EF' }
}

async function getDadosDashboard() {
  const agora = new Date()

  const [
    pedidosEmProducao,
    pedidosAtrasados,
    filamentosEstoqueBaixo,
    ultimosPedidos,
  ] = await Promise.all([
    prisma.pedido.count({ where: { status: 'EM_PRODUCAO' } }),
    prisma.pedido.count({
      where: {
        prazoEntrega: { lt: agora },
        status: { notIn: ['ENTREGUE', 'CANCELADO', 'CONCLUIDO'] },
      },
    }),
    prisma.filamento.count({
      where: {
        ativo: true,
        alertas: {
          some: { lido: false, tipoAlerta: 'ESTOQUE_BAIXO' },
        },
      },
    }),
    prisma.pedido.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { cliente: true },
    }),
  ])

  return {
    pedidosEmProducao,
    pedidosAtrasados,
    filamentosEstoqueBaixo,
    ultimosPedidos,
  }
}

export default async function PaginaDashboard() {
  const dados = await getDadosDashboard()

  const cartoes = [
    {
      titulo: 'Em Produção',
      valor: dados.pedidosEmProducao,
      corValor: 'var(--purple)',
      descricao: 'pedidos ativos',
    },
    {
      titulo: 'Pedidos Atrasados',
      valor: dados.pedidosAtrasados,
      corValor: 'var(--red)',
      descricao: 'prazo vencido',
    },
    {
      titulo: 'Estoque Baixo',
      valor: dados.filamentosEstoqueBaixo,
      corValor: 'var(--amber)',
      descricao: 'filamentos em alerta',
    },
  ]

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 700,
          fontSize: '24px',
          color: 'var(--text-primary)',
        }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Visão geral do sistema
        </p>
      </div>

      {/* Cartões de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {cartoes.map((cartao) => (
          <div
            key={cartao.titulo}
            style={{
              padding: '20px 24px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <p style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {cartao.titulo}
            </p>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: cartao.corValor,
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 1,
              marginBottom: '4px',
            }}>
              {cartao.valor}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              {cartao.descricao}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela — últimos pedidos */}
      <div style={{
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            color: 'var(--text-primary)',
          }}>
            Últimos Pedidos
          </h2>
          <Link
            href="/dashboard/pedidos"
            style={{ fontSize: '13px', color: 'var(--purple)', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
          >
            Ver todos →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                {['#', 'Cliente', 'Descrição', 'Status', 'Data'].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: '10px 24px',
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
              {dados.ultimosPedidos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                  >
                    Nenhum pedido cadastrado ainda
                  </td>
                </tr>
              ) : (
                dados.ultimosPedidos.map((pedido) => {
                  const { cor, fundo } = corStatus(pedido.status)
                  return (
                    <tr
                      key={pedido.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        #{pedido.numero}
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                        {pedido.cliente.nome}
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pedido.descricao}
                      </td>
                      <td style={{ padding: '12px 24px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                          color: cor,
                          backgroundColor: fundo,
                        }}>
                          {formatarStatus(pedido.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                        {pedido.createdAt.toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
