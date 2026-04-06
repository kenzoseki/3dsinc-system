'use client'

import { useEffect, useState, useCallback } from 'react'

interface ItemWS {
  id: string
  descricao: string
  quantidade: number
  valorUnitario: number | null
}

interface SolicitacaoWS {
  id: string
  numero: number
  etapa: string
  clienteNome: string
  dataInicioProducao: string | null
  dataFimProducao: string | null
  createdAt: string
  itens: ItemWS[]
}

type Secao = {
  titulo: string
  etapas: string[]
  cor: { bg: string; cor: string }
  acoes: { label: string; novaEtapa: string; cor: string }[]
}

const SECOES: Secao[] = [
  {
    titulo: 'Aguardando Produção',
    etapas: ['SOLICITACAO', 'CUSTO_VIABILIDADE', 'APROVACAO'],
    cor: { bg: '#FEF3E2', cor: '#8A5A0A' },
    acoes: [],
  },
  {
    titulo: 'Em Produção',
    etapas: ['PRODUCAO'],
    cor: { bg: '#EDE9FC', cor: '#4C3DB5' },
    acoes: [
      { label: 'Concluir Produção', novaEtapa: 'CALCULO_FRETE', cor: 'var(--green)' },
    ],
  },
  {
    titulo: 'Produção Finalizada',
    etapas: ['CALCULO_FRETE', 'ENVIADO', 'FINALIZADO'],
    cor: { bg: '#E8F5EE', cor: '#1A6B42' },
    acoes: [],
  },
]

const labelEtapa: Record<string, string> = {
  SOLICITACAO: 'Solicitação',
  CUSTO_VIABILIDADE: 'Custo e Viabilidade',
  APROVACAO: 'Aguardando Aprovação',
  PRODUCAO: 'Produção',
  CALCULO_FRETE: 'Cálculo de Frete',
  ENVIADO: 'Enviado',
  FINALIZADO: 'Finalizado',
}

export default function PaginaProducao() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoWS[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/workspace')
      if (r.ok) {
        const dados = await r.json()
        setSolicitacoes(dados.filter((s: SolicitacaoWS) => s.etapa !== 'CANCELADO'))
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function mudarEtapa(id: string, novaEtapa: string) {
    setAtualizando(id)
    try {
      const r = await fetch(`/api/workspace/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: novaEtapa }),
      })
      if (r.ok) carregar()
    } finally {
      setAtualizando(null)
    }
  }

  function porSecao(etapas: string[]) {
    return solicitacoes.filter(s => etapas.includes(s.etapa))
  }

  const totalAtivos = solicitacoes.length

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
          Produção
        </h1>
        {!carregando && (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
            {porSecao(['SOLICITACAO', 'CUSTO_VIABILIDADE', 'APROVACAO']).length} aguardando · {porSecao(['PRODUCAO']).length} em produção · {porSecao(['CALCULO_FRETE', 'ENVIADO', 'FINALIZADO']).length} finalizados
            {totalAtivos === 0 && ' · Nenhuma solicitação ativa'}
          </p>
        )}
      </div>

      {carregando ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Carregando...
        </div>
      ) : totalAtivos === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Nenhuma solicitação no fluxo de produção.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {SECOES.map(secao => {
            const lista = porSecao(secao.etapas)
            return (
              <div key={secao.titulo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{
                    padding: '3px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif', background: secao.cor.bg, color: secao.cor.cor,
                  }}>
                    {secao.titulo}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {lista.length} solicitação{lista.length !== 1 ? 'ões' : ''}
                  </span>
                </div>

                {lista.length === 0 ? (
                  <div style={{ padding: '20px 24px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                    Nenhuma solicitação nesta etapa.
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                          {['#', 'Cliente', 'Itens', 'Etapa', 'Início Prod.', ...(secao.acoes.length > 0 ? ['Ações'] : [])].map(col => (
                            <th key={col} style={{
                              padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                              fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase',
                              letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                            }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                              #{s.numero}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                              {s.clienteNome}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                              {s.itens.length} item{s.itens.length !== 1 ? 's' : ''}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', backgroundColor: secao.cor.bg, color: secao.cor.cor }}>
                                {labelEtapa[s.etapa] ?? s.etapa}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                              {s.dataInicioProducao ? new Date(s.dataInicioProducao).toLocaleString('pt-BR') : '—'}
                            </td>
                            {secao.acoes.length > 0 && (
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {secao.acoes.map(acao => (
                                    <button
                                      key={acao.novaEtapa}
                                      disabled={atualizando === s.id}
                                      onClick={() => mudarEtapa(s.id, acao.novaEtapa)}
                                      style={{
                                        padding: '5px 12px', borderRadius: '6px', border: 'none',
                                        background: atualizando === s.id ? 'var(--border)' : acao.cor,
                                        color: '#fff', fontSize: '12px', fontWeight: 600,
                                        cursor: atualizando === s.id ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {atualizando === s.id ? '...' : acao.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
