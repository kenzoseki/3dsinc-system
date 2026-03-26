'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'

interface Orcamento {
  id: string
  numero: number
  revisao: number
  clienteNome: string
  clienteEmpresa: string | null
  status: string
  dataEmissao: string
  itens: { valorUnitario: number; quantidade: number }[]
  frete: number | null
  bonusPercentual: number | null
}

interface Paginacao {
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

const FILTROS = [
  { valor: '', label: 'Todos' },
  { valor: 'RASCUNHO', label: 'Rascunho' },
  { valor: 'ENVIADO', label: 'Andamento' },
  { valor: 'APROVADO', label: 'Aprovado' },
  { valor: 'REPROVADO', label: 'Reprovado' },
]

const labelStatus: Record<string, { label: string; bg: string; cor: string }> = {
  RASCUNHO:  { label: 'Rascunho',  bg: '#F3F2EF', cor: '#6B6860' },
  ENVIADO:   { label: 'Andamento', bg: 'var(--amber-light)', cor: 'var(--amber)' },
  APROVADO:  { label: 'Aprovado',  bg: 'var(--green-light)', cor: 'var(--green)' },
  REPROVADO: { label: 'Reprovado', bg: 'var(--red-light)', cor: 'var(--red)' },
}

function calcularTotal(orc: Orcamento): number {
  const subtotal = orc.itens.reduce((s, i) => s + Number(i.valorUnitario) * i.quantidade, 0)
  const frete = Number(orc.frete ?? 0)
  const bonus = subtotal * (Number(orc.bonusPercentual ?? 0) / 100)
  return subtotal + frete + bonus
}

const LIMITE = 20

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null)
  const [pagina, setPagina] = useState(1)
  const [statusFiltro, setStatusFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ paginado: 'true', pagina: String(pagina), limite: String(LIMITE) })
      if (statusFiltro) params.set('status', statusFiltro)
      const res = await fetch(`/api/orcamentos?${params}`)
      if (res.ok) {
        const dados = await res.json()
        setOrcamentos(dados.orcamentos ?? [])
        setPaginacao(dados.paginacao ?? null)
      }
    } finally {
      setCarregando(false)
    }
  }, [pagina, statusFiltro])

  useEffect(() => { carregar() }, [carregar])

  function mudarFiltro(valor: string) {
    setStatusFiltro(valor)
    setPagina(1)
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Cabeçalho */}
      <div className="cabecalho-pagina" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Orçamentos
          </h1>
          {paginacao && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              {paginacao.total} orçamento{paginacao.total !== 1 ? 's' : ''}
              {statusFiltro ? ` com status "${labelStatus[statusFiltro]?.label}"` : ' no total'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/dashboard/orcamentos/kanban"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)', color: 'var(--purple)',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif', border: '1px solid var(--purple-light)',
            }}
          >
            Kanban
          </Link>
          <Link
            href="/dashboard/orcamentos/novo"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '8px',
              backgroundColor: 'var(--purple)', color: '#fff',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            + Novo orçamento
          </Link>
        </div>
      </div>

      {/* Filtros de status */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {FILTROS.map(f => (
          <button
            key={f.valor}
            onClick={() => mudarFiltro(f.valor)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid',
              borderColor: statusFiltro === f.valor ? 'var(--purple)' : 'var(--border)',
              background: statusFiltro === f.valor ? 'var(--purple-light)' : 'var(--bg-surface)',
              color: statusFiltro === f.valor ? 'var(--purple-text)' : 'var(--text-secondary)',
              fontSize: '13px', fontWeight: statusFiltro === f.valor ? 600 : 400,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.1s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {carregando ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '40px' }}>Carregando...</p>
      ) : orcamentos.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          backgroundColor: 'var(--bg-surface)', borderRadius: '12px',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📄</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', marginBottom: '6px' }}>
            {statusFiltro ? 'Nenhum orçamento com este status' : 'Nenhum orçamento ainda'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            {statusFiltro ? 'Tente outro filtro ou crie um novo orçamento.' : 'Crie seu primeiro orçamento clicando em "+ Novo orçamento"'}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nº', 'Cliente', 'Data', 'Total', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: h === '' ? 'right' : 'left',
                    fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)',
                    fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--bg-page)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((orc, i) => {
                const st = labelStatus[orc.status] ?? labelStatus.RASCUNHO
                return (
                  <tr key={orc.id} style={{ borderBottom: i < orcamentos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      ORC-{String(orc.numero).padStart(4, '0')}-{String(orc.revisao).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>{orc.clienteNome}</p>
                      {orc.clienteEmpresa && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>{orc.clienteEmpresa}</p>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                      {new Date(orc.dataEmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {calcularTotal(orc).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif',
                        backgroundColor: st.bg, color: st.cor,
                      }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/dashboard/orcamentos/${orc.id}`}
                        style={{
                          fontSize: '13px', color: 'var(--purple)', fontFamily: 'Inter, sans-serif',
                          textDecoration: 'none', fontWeight: 500,
                        }}
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {paginacao && paginacao.totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)',
              cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.4 : 1,
            }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            Página {paginacao.pagina} de {paginacao.totalPaginas}
          </span>
          <button
            onClick={() => setPagina(p => Math.min(paginacao.totalPaginas, p + 1))}
            disabled={pagina === paginacao.totalPaginas}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)',
              cursor: pagina === paginacao.totalPaginas ? 'not-allowed' : 'pointer',
              opacity: pagina === paginacao.totalPaginas ? 0.4 : 1,
            }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
