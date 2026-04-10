'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface ResumoKPIs {
  totalPedidos:      number
  pedidosConcluidos: number
  pedidosAtivos:     number
  receitaEsperada:   number
  receitaReal:       number
  totalClientes:     number
}

interface PedidoRelatorio {
  id:          string
  numero:      number
  clienteNome: string
  descricao:   string
  status:      string
  valorTotal:  number | null
  createdAt:   string
  prazoEntrega: string | null
}

interface ClienteRelatorio {
  id:          string
  nome:        string
  empresa:     string | null
  totalPedidos: number
  receitaTotal: number
}

interface ReceitaMensal {
  mes: number
  valor: number
}

interface DistribuicaoStatus {
  status: string
  quantidade: number
}

interface DadosRelatorio {
  kpis:               ResumoKPIs
  pedidos:            PedidoRelatorio[]
  clientes:           ClienteRelatorio[]
  receitaMensal:      ReceitaMensal[]
  distribuicaoStatus: DistribuicaoStatus[]
}

const PERIODOS = [
  { valor: 'mes',      label: 'Este mês' },
  { valor: 'trimestre', label: 'Últimos 90 dias' },
  { valor: 'ano',      label: 'Este ano' },
  { valor: 'tudo',     label: 'Todos os tempos' },
]

const STATUS_BADGE: Record<string, { bg: string; cor: string }> = {
  ORCAMENTO:   { bg: '#FCE9E9', cor: '#B83232' },
  APROVADO:    { bg: '#FEF3E2', cor: '#8A5A0A' },
  AGUARDANDO:  { bg: '#FEF3E2', cor: '#8A5A0A' },
  EM_PRODUCAO: { bg: '#EDE9FC', cor: '#4C3DB5' },
  PAUSADO:     { bg: '#FCE9E9', cor: '#B83232' },
  CONCLUIDO:   { bg: '#E8F5EE', cor: '#1A6B42' },
  ENTREGUE:    { bg: '#E8F5EE', cor: '#1A6B42' },
  CANCELADO:   { bg: '#F3F2EF', cor: '#6B6860' },
}

const STATUS_COR_PIZZA: Record<string, string> = {
  ORCAMENTO:   '#B83232',
  APROVADO:    '#D4920A',
  AGUARDANDO:  '#C4850E',
  EM_PRODUCAO: '#5B47C8',
  PAUSADO:     '#E05A5A',
  CONCLUIDO:   '#1A6B42',
  ENTREGUE:    '#2A8B5A',
  CANCELADO:   '#9E9B94',
}

const STATUS_LABEL: Record<string, string> = {
  ORCAMENTO:   'Orçamento',
  APROVADO:    'Aprovado',
  AGUARDANDO:  'Aguardando',
  EM_PRODUCAO: 'Em Produção',
  PAUSADO:     'Pausado',
  CONCLUIDO:   'Concluído',
  ENTREGUE:    'Entregue',
  CANCELADO:   'Cancelado',
}

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PaginaRelatorios() {
  const [periodo, setPeriodo]       = useState('mes')
  const [dados, setDados]           = useState<DadosRelatorio | null>(null)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/relatorios?periodo=${periodo}`)
      if (res.ok) setDados(await res.json())
    } finally {
      setCarregando(false)
    }
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  const dadosBarras = dados?.receitaMensal.map(r => ({
    nome: MESES_LABEL[r.mes - 1],
    valor: r.valor,
  })) ?? []

  const dadosPizza = dados?.distribuicaoStatus.map(d => ({
    nome: STATUS_LABEL[d.status] ?? d.status,
    valor: d.quantidade,
    cor: STATUS_COR_PIZZA[d.status] ?? '#9E9B94',
  })) ?? []

  return (
    <div>
      {/* Cabeçalho — oculto na impressão */}
      <div className="sem-print rel-cabecalho" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Relatórios
          </h1>
          {dados && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {PERIODOS.find(p => p.valor === periodo)?.label}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none',
            }}
          >
            {PERIODOS.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
          </select>
          <button
            onClick={() => window.print()}
            disabled={carregando || !dados}
            style={{
              padding: '9px 18px', borderRadius: '8px', border: 'none',
              background: 'var(--purple)', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', opacity: carregando ? 0.5 : 1,
            }}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Carregando...
        </div>
      ) : !dados ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Erro ao carregar dados.
        </div>
      ) : (
        <div id="relatorio-conteudo">
          {/* Cabeçalho do PDF */}
          <div className="so-print" style={{ marginBottom: '24px', borderBottom: '2px solid #5B47C8', paddingBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#6B6860', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              3D Sinc — Sistema de Gestão
            </p>
            <h1 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: '#2C2A26', fontFamily: 'Nunito, sans-serif' }}>
              Relatório Gerencial — {PERIODOS.find(p => p.valor === periodo)?.label}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B6860', fontFamily: 'Inter, sans-serif' }}>
              Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* KPIs */}
          <div className="rel-kpis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { titulo: 'Total de Pedidos',    valor: String(dados.kpis.totalPedidos) },
              { titulo: 'Pedidos Concluídos',  valor: String(dados.kpis.pedidosConcluidos) },
              { titulo: 'Pedidos Ativos',      valor: String(dados.kpis.pedidosAtivos) },
            ].map(card => (
              <div key={card.titulo} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '16px',
              }}>
                <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                  {card.titulo}
                </p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {card.valor}
                </p>
              </div>
            ))}
          </div>
          <div className="rel-kpis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '16px',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                Receita Esperada
              </p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#8A5A0A', fontFamily: 'JetBrains Mono, monospace' }}>
                {brl(dados.kpis.receitaEsperada)}
              </p>
            </div>
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '16px',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                Receita Real
              </p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1A6B42', fontFamily: 'JetBrains Mono, monospace' }}>
                {brl(dados.kpis.receitaReal)}
              </p>
            </div>
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '16px',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                Clientes
              </p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {dados.kpis.totalClientes}
              </p>
            </div>
          </div>

          {/* Gráficos lado a lado */}
          <section style={{ marginBottom: '32px' }}>
            <div className="rel-graficos-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Gráfico de Barras — Receita Real Mensal */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>
                  Receita Real Mensal — {new Date().getFullYear()}
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dadosBarras} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#6B6860', fontFamily: 'Inter, sans-serif' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      formatter={(value) => [brl(Number(value ?? 0)), 'Receita Real']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                    />
                    <Bar dataKey="valor" fill="#5B47C8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Pizza — Distribuição por Status */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>
                  Pedidos por Status
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      dataKey="valor"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={2}
                      label={((props: { nome?: string; percent?: number }) => `${props.nome ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as never}
                      labelLine={{ stroke: '#6B6860', strokeWidth: 1 }}
                      style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
                    >
                      {dadosPizza.map((entry, idx) => (
                        <Cell key={idx} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${Number(value ?? 0)} pedido${Number(value ?? 0) !== 1 ? 's' : ''}`, name]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Tabela de Pedidos */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Pedidos ({dados.pedidos.length})
            </h2>
            <div className="rel-tabela-container" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Cliente', 'Descrição', 'Status', 'Valor', 'Data'].map(col => (
                      <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.pedidos.map((p, i) => {
                    const st = STATUS_BADGE[p.status] ?? STATUS_BADGE.CANCELADO
                    return (
                      <tr key={p.id} style={{ borderBottom: i < dados.pedidos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          #{String(p.numero).padStart(4, '0')}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                          {p.clienteNome}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', maxWidth: '200px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: st.bg, color: st.cor }}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-primary)' }}>
                          {p.valorTotal != null ? brl(p.valorTotal) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Clientes */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Clientes — Top por Receita
            </h2>
            <div className="rel-tabela-container" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Cliente', 'Empresa', 'Pedidos', 'Receita Total'].map(col => (
                      <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.clientes.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < dados.clientes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                        {c.nome}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                        {c.empresa ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {c.totalPedidos}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {brl(c.receitaTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}

      <style>{`
        @media print {
          .sem-print { display: none !important; }
          .so-print { display: block !important; }
          body { background: white !important; }
          #relatorio-conteudo { padding: 0; }
        }
        @media screen {
          .so-print { display: none; }
        }
      `}</style>
    </div>
  )
}
