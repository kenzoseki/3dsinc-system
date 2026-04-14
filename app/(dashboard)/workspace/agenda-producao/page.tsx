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

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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

  useEffect(() => { if (session) carregar() }, [session, carregar])
  useEffect(() => { if (session === null) router.push('/login') }, [session, router])

  // Exclui cancelados de toda a lógica
  const ativos = useMemo(() => solicitacoes.filter(s => s.etapa !== 'CANCELADO' && s.etapa !== 'FINALIZADO'), [solicitacoes])

  const semData = useMemo(() => ativos.filter(s => !s.dataEntrega), [ativos])

  const gridCalendario = useMemo(() => {
    const primeiroDia = new Date(mesAtual.ano, mesAtual.mes, 1)
    const ultimoDia = new Date(mesAtual.ano, mesAtual.mes + 1, 0)
    const totalDias = ultimoDia.getDate()
    const offsetInicio = primeiroDia.getDay()
    const celulas: { dia: number | null }[] = []
    for (let i = 0; i < offsetInicio; i++) celulas.push({ dia: null })
    for (let d = 1; d <= totalDias; d++) celulas.push({ dia: d })
    while (celulas.length % 7 !== 0) celulas.push({ dia: null })
    return celulas
  }, [mesAtual])

  const soliPorDia = useMemo(() => {
    const mapa: Record<string, Solicitacao[]> = {}
    ativos.forEach(s => {
      if (!s.dataEntrega) return
      const partes = s.dataEntrega.slice(0, 10).split('-')
      const ano = parseInt(partes[0]), mes = parseInt(partes[1]) - 1, dia = parseInt(partes[2])
      if (ano === mesAtual.ano && mes === mesAtual.mes) {
        const chave = dia.toString()
        if (!mapa[chave]) mapa[chave] = []
        mapa[chave].push(s)
      }
    })
    return mapa
  }, [ativos, mesAtual])

  function navMes(delta: number) {
    setMesAtual(prev => {
      let m = prev.mes + delta
      let a = prev.ano
      if (m < 0) { m = 11; a-- }
      if (m > 11) { m = 0; a++ }
      return { ano: a, mes: m }
    })
  }

  if (!session) return null

  const hoje = new Date()
  const isHojeMes = hoje.getFullYear() === mesAtual.ano && hoje.getMonth() === mesAtual.mes

  return (
    <div>
      {/* Header */}
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Agenda de Produção
          </h1>
          <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
            Calendário mensal de entregas
          </p>
        </div>
        <Link href="/workspace" style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', textDecoration: 'none', backgroundColor: 'transparent' }}>
          Voltar ao Workspace
        </Link>
      </div>

      {/* Warning: pedidos sem data de entrega */}
      {semData.length > 0 && (
        <div style={{
          marginBottom: '24px',
          padding: '14px 18px',
          borderRadius: '10px',
          backgroundColor: '#FEF3E2',
          border: '1px solid #F2C994',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <div style={{ fontSize: '20px', lineHeight: 1 }}>⚠</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#8A5A0A', margin: 0, marginBottom: '6px' }}>
              {semData.length} pedido{semData.length !== 1 ? 's' : ''} sem data de entrega
            </p>
            <p style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: '#8A5A0A', margin: 0, marginBottom: '10px' }}>
              Cadastre uma data de entrega para que apareçam no calendário.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {semData.map(s => (
                <div
                  key={s.id}
                  onClick={() => router.push('/workspace')}
                  style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>#{s.numero}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--text-primary)' }}>{s.clienteNome}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 5px', borderRadius: '6px', backgroundColor: corEtapa[s.etapa] + '18', color: corEtapa[s.etapa] }}>
                    {labelEtapa[s.etapa]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navegação do mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navMes(-1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-primary)' }}>◀</button>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', minWidth: '200px', textAlign: 'center' }}>
          {formatMes(mesAtual.ano, mesAtual.mes)}
        </h2>
        <button onClick={() => navMes(1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-primary)' }}>▶</button>
        <button onClick={() => { const a = new Date(); setMesAtual({ ano: a.getFullYear(), mes: a.getMonth() }) }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Hoje
        </button>
      </div>

      {carregando ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Carregando...</p>
      ) : (
        <div className="agenda-mkt-grid" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {diasSemana.map(d => (
              <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {gridCalendario.map((celula, idx) => {
              const isHoje = isHojeMes && celula.dia === hoje.getDate()
              const soliDia = celula.dia ? (soliPorDia[celula.dia.toString()] ?? []) : []
              return (
                <div
                  key={idx}
                  style={{
                    minHeight: '100px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: idx < gridCalendario.length - 7 ? '1px solid var(--border)' : 'none',
                    padding: '6px',
                    backgroundColor: isHoje ? 'var(--purple-light)' : celula.dia ? 'transparent' : 'var(--bg-page)',
                  }}
                >
                  {celula.dia && (
                    <>
                      <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: isHoje ? 700 : 400, color: isHoje ? 'var(--purple)' : 'var(--text-secondary)', marginBottom: '4px' }}>
                        {celula.dia}
                      </div>
                      {soliDia.map(s => (
                        <div
                          key={s.id}
                          onClick={() => router.push('/workspace')}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            backgroundColor: corEtapa[s.etapa] + '18',
                            borderLeft: `3px solid ${corEtapa[s.etapa]}`,
                            marginBottom: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          <p style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: corEtapa[s.etapa], margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            #{s.numero} · {s.clienteNome}
                          </p>
                          <p style={{ fontSize: '9px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', margin: 0 }}>
                            {labelEtapa[s.etapa]}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )
            })}
          </div>
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
