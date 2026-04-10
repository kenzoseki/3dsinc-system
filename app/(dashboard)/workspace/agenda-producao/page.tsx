'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'

type Etapa = 'SOLICITACAO' | 'CUSTO_VIABILIDADE' | 'APROVACAO' | 'PRODUCAO' | 'CALCULO_FRETE' | 'ENVIADO' | 'FINALIZADO' | 'CANCELADO'

interface ItemWS {
  id: string
  descricao: string
  quantidade: number
}

interface Solicitacao {
  id: string
  numero: number
  etapa: Etapa
  clienteNome: string
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'
  dataEntrega: string | null
  createdAt: string
  dataInicioProducao: string | null
  dataFimProducao: string | null
  itens: ItemWS[]
}

const labelEtapa: Record<Etapa, string> = {
  SOLICITACAO: 'Solicitação',
  CUSTO_VIABILIDADE: 'Custo e Viab.',
  APROVACAO: 'Aguardando Aprov.',
  PRODUCAO: 'Produção',
  CALCULO_FRETE: 'Cálc. Frete',
  ENVIADO: 'Enviado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const corEtapa: Record<Etapa, string> = {
  SOLICITACAO: '#5B47C8',
  CUSTO_VIABILIDADE: '#8A5A0A',
  APROVACAO: '#1A6B42',
  PRODUCAO: '#4C3DB5',
  CALCULO_FRETE: '#7C5A14',
  ENVIADO: '#6B6860',
  FINALIZADO: '#1A6B42',
  CANCELADO: '#B83232',
}

const corPrioridade: Record<string, string> = {
  BAIXA: '#6B6860',
  NORMAL: '#4C3DB5',
  ALTA: '#8A5A0A',
  URGENTE: '#B83232',
}

function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate()
}

function formatMes(ano: number, mes: number) {
  const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${nomes[mes]} ${ano}`
}

export default function PaginaAgendaProducao() {
  const { data: session } = useSession()
  const router = useRouter()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mesAtual, setMesAtual] = useState(() => {
    const agora = new Date()
    return { ano: agora.getFullYear(), mes: agora.getMonth() }
  })

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/workspace')
      if (r.ok) setSolicitacoes(await r.json())
    } finally { setCarregando(false) }
  }, [])

  useEffect(() => {
    if (session) carregar()
  }, [session, carregar])

  useEffect(() => {
    if (session === null) router.push('/login')
  }, [session, router])

  const totalDias = diasNoMes(mesAtual.ano, mesAtual.mes)
  const inicioMes = new Date(mesAtual.ano, mesAtual.mes, 1)
  const fimMes = new Date(mesAtual.ano, mesAtual.mes, totalDias, 23, 59, 59)

  // Filtra solicitacoes que tocam o mês (criadas antes do fim E entrega/agora depois do início)
  const soliNoMes = useMemo(() => {
    return solicitacoes.filter(s => {
      if (s.etapa === 'CANCELADO') return false
      const criacao = new Date(s.createdAt)
      const entrega = s.dataEntrega ? new Date(s.dataEntrega) : null
      const fimCard = entrega ?? new Date() // se sem entrega, estende até hoje

      // Card toca o mês se: início <= fimMes E fim >= inicioMes
      return criacao <= fimMes && fimCard >= inicioMes
    }).sort((a, b) => {
      // Ordena por data de criação
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [solicitacoes, mesAtual.ano, mesAtual.mes, inicioMes, fimMes])

  function navMes(delta: number) {
    setMesAtual(prev => {
      let m = prev.mes + delta
      let a = prev.ano
      if (m < 0) { m = 11; a-- }
      if (m > 11) { m = 0; a++ }
      return { ano: a, mes: m }
    })
  }

  function diaParaPercent(d: Date) {
    const dia = d.getDate()
    return ((dia - 1) / totalDias) * 100
  }

  function calcBarra(s: Solicitacao) {
    const criacao = new Date(s.createdAt)
    const entrega = s.dataEntrega ? new Date(s.dataEntrega) : null
    const fim = entrega ?? new Date()

    // Clamp ao mês
    const start = criacao < inicioMes ? inicioMes : criacao
    const end = fim > fimMes ? fimMes : fim

    const left = diaParaPercent(start)
    const right = diaParaPercent(end)
    const width = Math.max(right - left, 1) // mínimo 1%

    return { left: `${left}%`, width: `${width}%` }
  }

  if (!session) return null

  return (
    <div>
      {/* Header */}
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Agenda de Produção
          </h1>
          <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
            Timeline mensal das solicitações
          </p>
        </div>
        <Link href="/workspace" style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', textDecoration: 'none', backgroundColor: 'transparent' }}>
          Voltar ao Workspace
        </Link>
      </div>

      {/* Navegação do mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navMes(-1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-primary)' }}>
          ◀
        </button>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', minWidth: '200px', textAlign: 'center' }}>
          {formatMes(mesAtual.ano, mesAtual.mes)}
        </h2>
        <button onClick={() => navMes(1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-primary)' }}>
          ▶
        </button>
        <button onClick={() => { const agora = new Date(); setMesAtual({ ano: agora.getFullYear(), mes: agora.getMonth() }) }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Hoje
        </button>
      </div>

      {carregando ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Carregando...</p>
      ) : (
        <div className="agenda-timeline-grid" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header dos dias */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
            <div style={{ width: '220px', flexShrink: 0, padding: '8px 12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', borderRight: '1px solid var(--border)' }}>
              Solicitação
            </div>
            <div style={{ flex: 1, position: 'relative', minHeight: '32px' }}>
              <div style={{ display: 'flex' }}>
                {Array.from({ length: totalDias }, (_, i) => {
                  const d = new Date(mesAtual.ano, mesAtual.mes, i + 1)
                  const isHoje = d.toDateString() === new Date().toDateString()
                  const isDom = d.getDay() === 0
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: '8px 0',
                        color: isHoje ? 'var(--purple)' : isDom ? 'var(--red)' : 'var(--text-secondary)',
                        fontWeight: isHoje ? 700 : 400,
                        backgroundColor: isHoje ? 'var(--purple-light)' : 'transparent',
                        borderRight: '1px solid var(--border)',
                      }}
                    >
                      {i + 1}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Cards / timeline rows */}
          {soliNoMes.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
                Nenhuma solicitação neste mês
              </p>
            </div>
          ) : soliNoMes.map((s, idx) => {
            const barra = calcBarra(s)
            const isAtrasado = s.dataEntrega && new Date(s.dataEntrega) < new Date() && s.etapa !== 'FINALIZADO' && s.etapa !== 'ENVIADO'
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  borderBottom: idx < soliNoMes.length - 1 ? '1px solid var(--border)' : 'none',
                  minHeight: '48px',
                }}
              >
                {/* Info lateral */}
                <div style={{ width: '220px', flexShrink: 0, padding: '8px 12px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>#{s.numero}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 5px', borderRadius: '6px', backgroundColor: corEtapa[s.etapa] + '18', color: corEtapa[s.etapa] }}>
                      {labelEtapa[s.etapa]}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {s.clienteNome}
                  </p>
                  <p style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', margin: 0 }}>
                    {s.itens.length} item{s.itens.length !== 1 ? 's' : ''}
                    {s.dataEntrega && (
                      <span style={{ color: isAtrasado ? 'var(--red)' : 'var(--text-secondary)', fontWeight: isAtrasado ? 600 : 400 }}>
                        {' '}· Entrega: {new Date(s.dataEntrega).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </p>
                </div>

                {/* Timeline bar */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {/* Hoje marker */}
                  {(() => {
                    const hoje = new Date()
                    if (hoje >= inicioMes && hoje <= fimMes) {
                      return (
                        <div style={{
                          position: 'absolute',
                          left: `${diaParaPercent(hoje)}%`,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          backgroundColor: 'var(--purple)',
                          opacity: 0.25,
                          zIndex: 0,
                        }} />
                      )
                    }
                    return null
                  })()}

                  {/* Barra colorida */}
                  <div
                    title={`${s.clienteNome} — ${labelEtapa[s.etapa]}${s.dataEntrega ? ` · Entrega: ${new Date(s.dataEntrega).toLocaleDateString('pt-BR')}` : ''}`}
                    style={{
                      position: 'absolute',
                      left: barra.left,
                      width: barra.width,
                      height: '22px',
                      borderRadius: '4px',
                      background: isAtrasado
                        ? `linear-gradient(90deg, ${corEtapa[s.etapa]}, var(--red))`
                        : `linear-gradient(90deg, ${corEtapa[s.etapa]}CC, ${corEtapa[s.etapa]}66)`,
                      zIndex: 1,
                      cursor: 'pointer',
                      transition: 'opacity 0.12s',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      overflow: 'hidden',
                    }}
                    onClick={() => router.push(`/workspace`)}
                  >
                    <span style={{ fontSize: '9px', fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      #{s.numero}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="agenda-legenda" style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {(['SOLICITACAO', 'CUSTO_VIABILIDADE', 'APROVACAO', 'PRODUCAO', 'CALCULO_FRETE', 'ENVIADO'] as Etapa[]).map(e => (
          <div key={e} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: corEtapa[e] }} />
            <span style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>{labelEtapa[e]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
