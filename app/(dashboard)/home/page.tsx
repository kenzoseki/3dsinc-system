import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Suspense } from 'react'
import { SeletorPeriodo } from '@/components/dashboard/SeletorPeriodo'
import {
  GraficioPedidosStatusDynamic as GraficioPedidosStatus,
  GraficoReceitaDynamic as GraficoReceita,
  GraficoTipoPedidoDynamic as GraficoTipoPedido,
  type DadoPedidoStatusTempo,
  type DadoTipoPedido,
  type DadoReceita,
} from '@/components/dashboard/GraficosDynamic'

// ---------- helpers de período ----------

function calcularPeriodo(periodo: string): { dataInicio: Date; dataFim: Date } {
  const agora = new Date()
  const dataFim = agora

  switch (periodo) {
    case 'hoje': {
      const dataInicio = new Date(agora)
      dataInicio.setHours(0, 0, 0, 0)
      return { dataInicio, dataFim }
    }
    case 'semana': {
      const dataInicio = new Date(agora)
      const dia = dataInicio.getDay()
      const diff = dia === 0 ? -6 : 1 - dia
      dataInicio.setDate(dataInicio.getDate() + diff)
      dataInicio.setHours(0, 0, 0, 0)
      return { dataInicio, dataFim }
    }
    case 'trimestre': {
      const dataInicio = new Date(agora)
      dataInicio.setDate(dataInicio.getDate() - 90)
      return { dataInicio, dataFim }
    }
    case 'ano': {
      const dataInicio = new Date(agora.getFullYear(), 0, 1)
      return { dataInicio, dataFim }
    }
    default: { // mes
      const dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
      return { dataInicio, dataFim }
    }
  }
}

function granularidade(periodo: string): 'dia' | 'semana' | 'mes' {
  if (periodo === 'hoje' || periodo === 'semana') return 'dia'
  if (periodo === 'mes') return 'dia'
  if (periodo === 'trimestre') return 'semana'
  return 'mes'
}

function chaveData(data: Date, gran: 'dia' | 'semana' | 'mes'): string {
  if (gran === 'mes') {
    return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  }
  if (gran === 'semana') {
    const segunda = new Date(data)
    const dia = segunda.getDay()
    segunda.setDate(segunda.getDate() - (dia === 0 ? 6 : dia - 1))
    return segunda.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ---------- busca de dados ----------

async function getDados(periodo: string) {
  const { dataInicio, dataFim } = calcularPeriodo(periodo)
  const gran = granularidade(periodo)

  const [pedidosPeriodo, pedidosEmProducao, totalClientes, ultimosPedidos, ultimosOrcamentos, workspaceGrupos] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: dataInicio, lte: dataFim } },
      select: { id: true, numero: true, status: true, tipo: true, valorTotal: true, createdAt: true },
    }),
    prisma.pedido.count({ where: { status: 'EM_PRODUCAO' } }),
    prisma.cliente.count(),
    prisma.pedido.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numero: true,
        descricao: true,
        status: true,
        tipo: true,
        createdAt: true,
        cliente: { select: { nome: true } },
      },
    }),
    prisma.orcamento.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numero: true,
        revisao: true,
        clienteNome: true,
        clienteEmpresa: true,
        frete: true,
        bonusPercentual: true,
        status: true,
        createdAt: true,
        itens: { select: { valorUnitario: true, quantidade: true } },
      },
    }),
    prisma.workspace.groupBy({
      by: ['etapa'],
      _count: { id: true },
    }),
  ])

  // Workspace por etapa
  const workspacePorEtapa: Record<string, number> = {}
  for (const g of workspaceGrupos) {
    workspacePorEtapa[g.etapa] = g._count.id
  }

  // Métricas
  const totalPedidos = pedidosPeriodo.length
  const receita = pedidosPeriodo.reduce((s, p) => s + Number(p.valorTotal ?? 0), 0)
  const ticketMedio = totalPedidos > 0 ? receita / totalPedidos : 0

  // Chart 1 — pedidos por status ao longo do tempo
  const mapaStatus: Record<string, Record<string, number>> = {}
  for (const p of pedidosPeriodo) {
    const chave = chaveData(p.createdAt, gran)
    if (!mapaStatus[chave]) mapaStatus[chave] = {}
    mapaStatus[chave][p.status] = (mapaStatus[chave][p.status] ?? 0) + 1
  }
  const dadosPedidosStatus: DadoPedidoStatusTempo[] = Object.entries(mapaStatus).map(
    ([data, contagens]) => ({ data, ...contagens })
  )

  // Chart 2 — B2C vs B2B
  const b2c = pedidosPeriodo.filter(p => (p as any).tipo === 'B2C' || !(p as any).tipo).length
  const b2b = pedidosPeriodo.filter(p => (p as any).tipo === 'B2B').length
  const dadosTipo: DadoTipoPedido[] = [
    { tipo: 'Pessoa Física', valor: b2c },
    { tipo: 'Pessoa Jurídica', valor: b2b },
  ]

  // Chart 4 — receita por período
  const mapaReceita: Record<string, number> = {}
  for (const p of pedidosPeriodo) {
    const chave = chaveData(p.createdAt, gran)
    mapaReceita[chave] = (mapaReceita[chave] ?? 0) + Number(p.valorTotal ?? 0)
  }
  const dadosReceita: DadoReceita[] = Object.entries(mapaReceita).map(
    ([data, valor]) => ({ data, valor: Math.round(valor * 100) / 100 })
  )

  return {
    totalPedidos,
    pedidosEmProducao,
    receita,
    ticketMedio,
    totalClientes,
    dadosPedidosStatus,
    dadosTipo,
    dadosReceita,
    ultimosPedidos,
    ultimosOrcamentos,
    workspacePorEtapa,
  }
}

// ---------- helpers visuais ----------

function formatarStatus(status: string): string {
  const mapa: Record<string, string> = {
    ORCAMENTO: 'Orçamento', APROVADO: 'Aprovado', EM_PRODUCAO: 'Em Produção',
    PAUSADO: 'Pausado', CONCLUIDO: 'Concluído', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
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

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const estiloCard = {
  padding: '20px 24px',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

// ---------- página ----------

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { periodo = 'mes' } = await searchParams
  const dados = await getDados(periodo)

  const cards = [
    { titulo: 'Pedidos no Período', valor: dados.totalPedidos, corValor: 'var(--text-primary)', descricao: 'pedidos criados', mono: true },
    { titulo: 'Em Produção', valor: dados.pedidosEmProducao, corValor: 'var(--purple)', descricao: 'pedidos ativos agora', mono: true },
    { titulo: 'Receita no Período', valor: formatarMoeda(dados.receita), corValor: 'var(--green)', descricao: 'valor total', mono: false },
    { titulo: 'Ticket Médio', valor: formatarMoeda(dados.ticketMedio), corValor: 'var(--text-primary)', descricao: 'por pedido', mono: false },
    { titulo: 'Workspace Ativos', valor: Object.entries(dados.workspacePorEtapa).filter(([k]) => !['FINALIZADO', 'CANCELADO'].includes(k)).reduce((s, [, v]) => s + v, 0), corValor: 'var(--purple)', descricao: 'solicitações em andamento', mono: true },
    { titulo: 'Total de Clientes', valor: dados.totalClientes, corValor: 'var(--amber)', descricao: 'clientes cadastrados', mono: true },
  ]

  return (
    <div>
      {/* Cabeçalho + seletor de período */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
            Visão geral do sistema
          </p>
        </div>
        <Suspense>
          <SeletorPeriodo />
        </Suspense>
      </div>

      {/* Cards de métricas */}
      <div className="grid-metricas" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {cards.map((c) => (
          <div key={c.titulo} style={estiloCard}>
            <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {c.titulo}
            </p>
            <p style={{ fontSize: c.mono ? '32px' : '22px', fontWeight: 700, color: c.corValor, fontFamily: c.mono ? 'JetBrains Mono, monospace' : 'Nunito, sans-serif', lineHeight: 1, marginBottom: '4px' }}>
              {c.valor}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              {c.descricao}
            </p>
          </div>
        ))}
      </div>

      {/* Gráficos — linha 1 */}
      <div className="grid-graficos-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <GraficioPedidosStatus dados={dados.dadosPedidosStatus} />
        <GraficoReceita dados={dados.dadosReceita} />
      </div>

      {/* Gráficos — linha 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
        <GraficoTipoPedido dados={dados.dadosTipo} />
      </div>

      {/* Workspace Flow */}
      <div style={{ borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
            Workspace — Fluxo
          </h2>
          <Link href="/workspace" style={{ fontSize: '13px', color: 'var(--purple)', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
            Abrir Workspace →
          </Link>
        </div>
        <div className="workspace-flow-bar" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {([
            { etapa: 'SOLICITACAO', label: 'SOL', cor: '#5B47C8', fundo: '#EDE9FC' },
            { etapa: 'CUSTO_VIABILIDADE', label: 'C&V', cor: '#8A5A0A', fundo: '#FEF3E2' },
            { etapa: 'APROVACAO', label: 'APR', cor: '#1A6B42', fundo: '#E8F5EE' },
            { etapa: 'PRODUCAO', label: 'PROD', cor: '#4C3DB5', fundo: '#EDE9FC' },
            { etapa: 'CALCULO_FRETE', label: 'FRETE', cor: '#7C5A14', fundo: '#FEF3E2' },
            { etapa: 'ENVIADO', label: 'ENV', cor: '#6B6860', fundo: '#F3F2EF' },
          ] as const).map((item, idx) => {
            const count = dados.workspacePorEtapa[item.etapa] ?? 0
            const maxCount = Math.max(1, ...Object.values(dados.workspacePorEtapa))
            const barWidth = Math.max(40, (count / maxCount) * 100)
            return (
              <div key={item.etapa} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '80px' }}>
                <div style={{ flex: 1, borderRadius: '6px', backgroundColor: item.fundo, border: `1px solid ${item.cor}22`, padding: '8px 10px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${barWidth}%`, backgroundColor: `${item.cor}15`, borderRadius: '6px', transition: 'width 0.3s' }} />
                  <p style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'Inter, sans-serif', color: item.cor, margin: '0 0 2px', position: 'relative' }}>{item.label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: item.cor, margin: 0, position: 'relative' }}>{count}</p>
                </div>
                {idx < 5 && <span className="flow-arrow" style={{ color: 'var(--text-secondary)', fontSize: '10px', flexShrink: 0 }}>→</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Últimos pedidos */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
            Últimos Pedidos
          </h2>
          <Link href="/workspace/pedidos" style={{ fontSize: '13px', color: 'var(--purple)', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
            Ver todos →
          </Link>
        </div>
        <div className="home-tabela-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                {['#', 'Cliente', 'Tipo', 'Descrição', 'Status', 'Data'].map((col) => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 24px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.ultimosPedidos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                    Nenhum pedido cadastrado ainda
                  </td>
                </tr>
              ) : (
                dados.ultimosPedidos.map((pedido) => {
                  const { cor, fundo } = corStatus(pedido.status)
                  const tipo = (pedido as any).tipo ?? 'B2C'
                  return (
                    <tr key={pedido.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>#{pedido.numero}</td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{pedido.cliente.nome}</td>
                      <td style={{ padding: '12px 24px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', backgroundColor: tipo === 'B2B' ? '#E8F5EE' : '#EDE9FC', color: tipo === 'B2B' ? '#1A6B42' : '#4C3DB5' }}>
                          {tipo === 'B2B' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pedido.descricao}</td>
                      <td style={{ padding: '12px 24px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: cor, backgroundColor: fundo }}>
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

      {/* Orçamentos recentes */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
            Orçamentos Recentes
          </h2>
          <Link href="/workspace/orcamentos" style={{ fontSize: '13px', color: 'var(--purple)', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
            Ver todos →
          </Link>
        </div>
        <div className="home-tabela-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                {['Número', 'Cliente', 'Total', 'Status', 'Data'].map((col) => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 24px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.ultimosOrcamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                    Nenhum orçamento gerado ainda
                  </td>
                </tr>
              ) : (
                dados.ultimosOrcamentos.map((orc) => {
                  const subtotal = orc.itens.reduce((s: number, i: { valorUnitario: unknown; quantidade: number }) => s + Number(i.valorUnitario) * i.quantidade, 0)
                  const total = subtotal + Number(orc.frete ?? 0) + subtotal * (Number(orc.bonusPercentual ?? 0) / 100)
                  const stLabel: Record<string, { label: string; cor: string; fundo: string }> = {
                    RASCUNHO: { label: 'Rascunho', cor: '#6B6860', fundo: '#F3F2EF' },
                    ENVIADO:  { label: 'Enviado',  cor: '#8A5A0A', fundo: '#FEF3E2' },
                    APROVADO: { label: 'Aprovado', cor: '#1A6B42', fundo: '#E8F5EE' },
                    REPROVADO:{ label: 'Reprovado',cor: '#B83232', fundo: '#FCE9E9' },
                    EXPIRADO: { label: 'Expirado', cor: '#6B6860', fundo: '#F3F2EF' },
                  }
                  const st = stLabel[orc.status] ?? stLabel.RASCUNHO
                  return (
                    <tr key={orc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        ORC-{String(orc.numero).padStart(4, '0')}-{String(orc.revisao).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                        {orc.clienteNome}
                        {orc.clienteEmpresa && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}> ({orc.clienteEmpresa})</span>}
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td style={{ padding: '12px 24px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: st.cor, backgroundColor: st.fundo }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                        {new Date(orc.createdAt).toLocaleDateString('pt-BR')}
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
