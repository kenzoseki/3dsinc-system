'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

type StatusOrc = 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'REPROVADO'

const COLUNAS: { valor: StatusOrc; label: string; bg: string; cor: string }[] = [
  { valor: 'RASCUNHO',  label: 'Rascunho',  bg: '#F3F2EF', cor: '#6B6860' },
  { valor: 'ENVIADO',   label: 'Andamento',  bg: 'var(--amber-light)', cor: 'var(--amber)' },
  { valor: 'APROVADO',  label: 'Aprovado',   bg: 'var(--green-light)', cor: 'var(--green)' },
  { valor: 'REPROVADO', label: 'Reprovado',  bg: 'var(--red-light)', cor: 'var(--red)' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function calcularTotal(orc: Orcamento): number {
  const subtotal = orc.itens.reduce((s, i) => s + Number(i.valorUnitario) * i.quantidade, 0)
  const frete = Number(orc.frete ?? 0)
  const bonus = subtotal * (Number(orc.bonusPercentual ?? 0) / 100)
  return subtotal + frete + bonus
}

export default function KanbanOrcamentos() {
  const router = useRouter()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [movendo, setMovendo] = useState<string | null>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<StatusOrc | null>(null)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/orcamentos')
      if (res.ok) {
        const dados = await res.json()
        setOrcamentos(Array.isArray(dados) ? dados : dados.orcamentos ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function moverStatus(orc: Orcamento, novoStatus: StatusOrc) {
    if (orc.status === novoStatus) return
    if (novoStatus === 'ENVIADO') {
      if (!orc.clienteNome.trim()) { alert('Orçamento precisa ter nome do cliente.'); return }
      if (!orc.itens.some(i => Number(i.valorUnitario) > 0)) { alert('Orçamento precisa ter ao menos um item com valor.'); return }
    }
    setMovendo(orc.id)
    try {
      const res = await fetch(`/api/orcamentos/${orc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) carregar()
    } finally {
      setMovendo(null)
    }
  }

  const porStatus = (status: StatusOrc) => orcamentos.filter(o => o.status === status)
  const totalStatus = (status: StatusOrc) => porStatus(status).reduce((s, o) => s + calcularTotal(o), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>←</button>
          <div>
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Kanban de Orçamentos
            </h1>
            {!carregando && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
                {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}
                {totalStatus('APROVADO') > 0 && ` · ${brl(totalStatus('APROVADO'))} aprovados`}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/workspace/orcamentos/novo"
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

      {carregando ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Carregando...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'start' }}>
          {COLUNAS.map(col => {
            const lista = porStatus(col.valor)
            const total = totalStatus(col.valor)
            const ehAlvo = colunaAlvo === col.valor && arrastandoId !== null
            return (
              <div
                key={col.valor}
                onDragOver={e => { e.preventDefault(); setColunaAlvo(col.valor) }}
                onDragLeave={() => setColunaAlvo(null)}
                onDrop={e => {
                  e.preventDefault()
                  setColunaAlvo(null)
                  const orc = orcamentos.find(o => o.id === arrastandoId)
                  if (orc && orc.status !== col.valor) moverStatus(orc, col.valor)
                  setArrastandoId(null)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {col.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px',
                    fontSize: '11px', fontWeight: 600, background: col.bg, color: col.cor,
                  }}>
                    {lista.length}
                  </span>
                </div>
                {total > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 10px' }}>
                    {brl(total)}
                  </p>
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  minHeight: '60px', borderRadius: '10px', padding: '4px',
                  transition: 'background 0.15s',
                  background: ehAlvo ? col.bg : 'transparent',
                  outline: ehAlvo ? `2px dashed ${col.cor}` : 'none',
                }}>
                  {lista.length === 0 && !ehAlvo ? (
                    <div style={{
                      padding: '20px 14px', background: 'var(--bg-surface)', borderRadius: '10px',
                      border: '1px dashed var(--border)', textAlign: 'center',
                      fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif',
                    }}>
                      Nenhum orçamento
                    </div>
                  ) : lista.map(orc => (
                    <Link
                      key={orc.id}
                      href={`/workspace/orcamentos/${orc.id}`}
                      draggable
                      onDragStart={() => setArrastandoId(orc.id)}
                      onDragEnd={() => { setArrastandoId(null); setColunaAlvo(null) }}
                      style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '14px', textDecoration: 'none',
                        opacity: (movendo === orc.id || arrastandoId === orc.id) ? 0.4 : 1,
                        transition: 'opacity 0.15s', cursor: 'grab', display: 'block',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: '0 0 2px', fontSize: '11px', fontWeight: 600, color: 'var(--purple)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            ORC-{String(orc.numero).padStart(4, '0')}-{String(orc.revisao).padStart(2, '0')}
                          </p>
                          <p style={{
                            margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                            fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {orc.clienteNome}
                          </p>
                          {orc.clienteEmpresa && (
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                              {orc.clienteEmpresa}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                          {new Date(orc.dataEmissao).toLocaleDateString('pt-BR')}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {brl(calcularTotal(orc))}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
