'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
  BarChart as BarChartH,
} from 'recharts'

export type DadoPedidoStatusTempo = { data: string; [status: string]: number | string }
export type DadoFilamento = { nome: string; percentual: number; pesoAtual: number; pesoTotal: number }
export type DadoTipoPedido = { tipo: string; valor: number }
export type DadoReceita = { data: string; valor: number }

const COR_STATUS: Record<string, string> = {
  ORCAMENTO:   '#8A5A0A',
  APROVADO:    '#5B47C8',
  EM_PRODUCAO: '#4C3DB5',
  PAUSADO:     '#B83232',
  CONCLUIDO:   '#1A6B42',
  ENTREGUE:    '#0D4F30',
  CANCELADO:   '#9E9C96',
}

const LABEL_STATUS: Record<string, string> = {
  ORCAMENTO:   'Orçamento',
  APROVADO:    'Aprovado',
  EM_PRODUCAO: 'Em Produção',
  PAUSADO:     'Pausado',
  CONCLUIDO:   'Concluído',
  ENTREGUE:    'Entregue',
  CANCELADO:   'Cancelado',
}

const estiloCartao = {
  padding: '20px 24px',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const estiloTitulo = {
  fontFamily: 'Nunito, sans-serif',
  fontWeight: 700,
  fontSize: '15px',
  color: 'var(--text-primary)',
  marginBottom: '16px',
}

function corFilamento(percentual: number) {
  if (percentual < 20) return '#B83232'
  if (percentual < 50) return '#8A5A0A'
  return '#1A6B42'
}

// ----- Gráfico 1: Pedidos por status ao longo do tempo -----
export function GraficioPedidosStatus({ dados }: { dados: DadoPedidoStatusTempo[] }) {
  if (!dados.length) return <div style={estiloCartao}><p style={estiloTitulo}>Pedidos por Status</p><p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Sem dados no período</p></div>

  const statusPresentes = Object.keys(dados[0]).filter(k => k !== 'data')

  return (
    <div style={estiloCartao}>
      <p style={estiloTitulo}>Pedidos por Status</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dados} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="data" tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: 'var(--text-secondary)' }} />
          <YAxis tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: 'var(--text-secondary)' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
            formatter={(value, name) => [value, LABEL_STATUS[name as string] ?? name]}
          />
          <Legend formatter={(value) => LABEL_STATUS[value] ?? value} wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} />
          {statusPresentes.map(status => (
            <Bar key={status} dataKey={status} stackId="a" fill={COR_STATUS[status] ?? '#9E9C96'} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ----- Gráfico 2: Estoque de filamentos (barras horizontais) -----
export function GraficoFilamentos({ dados }: { dados: DadoFilamento[] }) {
  return (
    <div style={estiloCartao}>
      <p style={estiloTitulo}>Estoque de Filamentos</p>
      {dados.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Nenhum filamento cadastrado</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dados.map((f, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {f.nome}
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: corFilamento(f.percentual) }}>
                  {f.pesoAtual}g / {f.pesoTotal}g
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(f.percentual)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${f.nome}: ${Math.round(f.percentual)}% restante`}
                style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--border)', overflow: 'hidden' }}
              >
                <div style={{
                  height: '100%',
                  width: `${Math.min(f.percentual, 100)}%`,
                  borderRadius: '4px',
                  backgroundColor: corFilamento(f.percentual),
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ----- Gráfico 3: B2C vs B2B -----
const COR_TIPO = ['#5B47C8', '#1A6B42']

export function GraficoTipoPedido({ dados }: { dados: DadoTipoPedido[] }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  return (
    <div style={estiloCartao}>
      <p style={estiloTitulo}>Pessoa Física vs Jurídica</p>
      {total === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Sem pedidos no período</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="tipo" cx="50%" cy="50%" outerRadius={60} innerRadius={36}>
                {dados.map((_, i) => <Cell key={i} fill={COR_TIPO[i % COR_TIPO.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dados.map((d, i) => (
              <div key={d.tipo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: COR_TIPO[i % COR_TIPO.length] }} />
                <span style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' }}>
                  {d.tipo} — <strong>{d.valor}</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}> ({total > 0 ? Math.round(d.valor / total * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----- Gráfico 4: Receita por período -----
export function GraficoReceita({ dados }: { dados: DadoReceita[] }) {
  return (
    <div style={estiloCartao}>
      <p style={estiloTitulo}>Receita no Período</p>
      {dados.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Sem receita no período</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dados} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="data" tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: 'var(--text-secondary)' }}
              tickFormatter={(v) => `R$${v}`} />
            <Tooltip
              contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
              formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
            />
            <Line type="monotone" dataKey="valor" stroke="#5B47C8" strokeWidth={2} dot={{ fill: '#5B47C8', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
