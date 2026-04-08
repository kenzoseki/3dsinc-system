'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'

type Etapa = 'IDEIA' | 'PLANEJAMENTO' | 'PRODUCAO' | 'REVISAO' | 'AGENDADO' | 'PUBLICADO'

interface CardMkt {
  id: string
  titulo: string
  etapa: Etapa
  plataforma: string | null
  responsavel: string | null
  dataPublicacao: string | null
  createdAt: string
}

const labelEtapa: Record<Etapa, string> = {
  IDEIA: 'Ideia',
  PLANEJAMENTO: 'Planejamento',
  PRODUCAO: 'Produção',
  REVISAO: 'Revisão',
  AGENDADO: 'Agendado',
  PUBLICADO: 'Publicado',
}

const corEtapa: Record<Etapa, string> = {
  IDEIA: '#5B47C8',
  PLANEJAMENTO: '#8A5A0A',
  PRODUCAO: '#4C3DB5',
  REVISAO: '#7C5A14',
  AGENDADO: '#1A6B42',
  PUBLICADO: '#6B6860',
}

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatMes(ano: number, mes: number) {
  const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${nomes[mes]} ${ano}`
}

export default function PaginaAgendaMarketing() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cards, setCards] = useState<CardMkt[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mesAtual, setMesAtual] = useState(() => {
    const agora = new Date()
    return { ano: agora.getFullYear(), mes: agora.getMonth() }
  })

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/marketing')
      if (r.ok) setCards(await r.json())
    } finally { setCarregando(false) }
  }, [])

  useEffect(() => {
    if (session) carregar()
  }, [session, carregar])

  useEffect(() => {
    if (session === null) router.push('/login')
  }, [session, router])

  // Gera grid do calendário
  const gridCalendario = useMemo(() => {
    const primeiroDia = new Date(mesAtual.ano, mesAtual.mes, 1)
    const ultimoDia = new Date(mesAtual.ano, mesAtual.mes + 1, 0)
    const totalDias = ultimoDia.getDate()
    const offsetInicio = primeiroDia.getDay() // 0=Dom

    const celulas: { dia: number | null; data: Date | null }[] = []
    // Dias vazios antes
    for (let i = 0; i < offsetInicio; i++) celulas.push({ dia: null, data: null })
    // Dias do mês
    for (let d = 1; d <= totalDias; d++) {
      celulas.push({ dia: d, data: new Date(mesAtual.ano, mesAtual.mes, d) })
    }
    // Preenche até completar a última semana
    while (celulas.length % 7 !== 0) celulas.push({ dia: null, data: null })

    return celulas
  }, [mesAtual])

  // Agrupa cards com dataPublicacao por dia (parse seguro sem timezone)
  const cardsPorDia = useMemo(() => {
    const mapa: Record<string, CardMkt[]> = {}
    cards.forEach(c => {
      if (!c.dataPublicacao) return
      const partes = c.dataPublicacao.slice(0, 10).split('-')
      const ano = parseInt(partes[0]), mes = parseInt(partes[1]) - 1, dia = parseInt(partes[2])
      if (ano === mesAtual.ano && mes === mesAtual.mes) {
        const chave = dia.toString()
        if (!mapa[chave]) mapa[chave] = []
        mapa[chave].push(c)
      }
    })
    return mapa
  }, [cards, mesAtual])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Agenda de Marketing
          </h1>
          <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
            Calendário mensal de publicações
          </p>
        </div>
        <Link href="/workspace/marketing" style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', textDecoration: 'none', backgroundColor: 'transparent' }}>
          Voltar ao Kanban
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
        <button onClick={() => { const a = new Date(); setMesAtual({ ano: a.getFullYear(), mes: a.getMonth() }) }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Hoje
        </button>
      </div>

      {carregando ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Carregando...</p>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {diasSemana.map(d => (
              <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {gridCalendario.map((celula, idx) => {
              const isHoje = isHojeMes && celula.dia === hoje.getDate()
              const cardsDia = celula.dia ? (cardsPorDia[celula.dia.toString()] ?? []) : []
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
                      {cardsDia.map(c => (
                        <div
                          key={c.id}
                          onClick={() => router.push('/workspace/marketing')}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            backgroundColor: corEtapa[c.etapa] + '18',
                            borderLeft: `3px solid ${corEtapa[c.etapa]}`,
                            marginBottom: '3px',
                            cursor: 'pointer',
                            transition: 'opacity 0.12s',
                          }}
                        >
                          <p style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: corEtapa[c.etapa], margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.titulo}
                          </p>
                          {c.plataforma && (
                            <p style={{ fontSize: '9px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', margin: 0 }}>
                              {c.plataforma}
                            </p>
                          )}
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

      {/* Cards sem data */}
      {(() => {
        const semData = cards.filter(c => !c.dataPublicacao)
        if (semData.length === 0) return null
        return (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Sem data de publicação ({semData.length})
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {semData.map(c => (
                <div
                  key={c.id}
                  onClick={() => router.push('/workspace/marketing')}
                  style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'box-shadow 0.12s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
                >
                  <p style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', margin: 0 }}>{c.titulo}</p>
                  <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 5px', borderRadius: '6px', backgroundColor: corEtapa[c.etapa] + '18', color: corEtapa[c.etapa] }}>
                    {labelEtapa[c.etapa]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
