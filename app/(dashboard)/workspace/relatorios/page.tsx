'use client'

import { useEffect, useState, useCallback } from 'react'

interface ResumoKPIs {
  totalPedidos:      number
  pedidosConcluidos: number
  pedidosAtivos:     number
  receitaTotal:      number
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

interface FilamentoRelatorio {
  id:        string
  marca:     string
  material:  string
  cor:       string
  pesoAtual: number
  pesoTotal: number
}

interface DadosRelatorio {
  kpis:       ResumoKPIs
  pedidos:    PedidoRelatorio[]
  clientes:   ClienteRelatorio[]
  filamentos: FilamentoRelatorio[]
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

  return (
    <div>
      {/* Cabeçalho — oculto na impressão */}
      <div className="sem-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { titulo: 'Total de Pedidos',    valor: dados.kpis.totalPedidos,      mono: true },
              { titulo: 'Pedidos Concluídos',  valor: dados.kpis.pedidosConcluidos, mono: true },
              { titulo: 'Pedidos Ativos',      valor: dados.kpis.pedidosAtivos,     mono: true },
              { titulo: 'Receita do Período',  valor: brl(dados.kpis.receitaTotal), mono: true },
              { titulo: 'Clientes',            valor: dados.kpis.totalClientes,     mono: true },
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

          {/* Tabela de Pedidos */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Pedidos ({dados.pedidos.length})
            </h2>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
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
                            {p.status}
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
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
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

          {/* Estoque de Filamentos */}
          <section>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Estoque de Filamentos
            </h2>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                    {['Marca', 'Material', 'Cor', 'Peso Atual', 'Peso Total', 'Nível'].map(col => (
                      <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.filamentos.map((f, i) => {
                    const pct = Math.round((f.pesoAtual / f.pesoTotal) * 100)
                    const critico = pct < 20
                    return (
                      <tr key={f.id} style={{ borderBottom: i < dados.filamentos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{f.marca}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{f.material}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{f.cor}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: critico ? 'var(--red)' : 'var(--text-primary)' }}>
                          {f.pesoAtual}g
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {f.pesoTotal}g
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: critico ? 'var(--red)' : 'var(--green)', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: critico ? 'var(--red)' : 'var(--text-secondary)' }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
