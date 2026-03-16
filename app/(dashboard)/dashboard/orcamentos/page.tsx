'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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

const labelStatus: Record<string, { label: string; bg: string; cor: string }> = {
  RASCUNHO:  { label: 'Rascunho',  bg: '#F3F2EF', cor: '#6B6860' },
  ENVIADO:   { label: 'Enviado',   bg: 'var(--amber-light)', cor: 'var(--amber)' },
  APROVADO:  { label: 'Aprovado',  bg: 'var(--green-light)', cor: 'var(--green)' },
  REPROVADO: { label: 'Reprovado', bg: 'var(--red-light)', cor: 'var(--red)' },
  EXPIRADO:  { label: 'Expirado',  bg: '#F3F2EF', cor: '#6B6860' },
}

function calcularTotal(orc: Orcamento): number {
  const subtotal = orc.itens.reduce((s, i) => s + Number(i.valorUnitario) * i.quantidade, 0)
  const frete = Number(orc.frete ?? 0)
  const bonus = subtotal * (Number(orc.bonusPercentual ?? 0) / 100)
  return subtotal + frete + bonus
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/orcamentos')
      .then(r => r.json())
      .then(data => { setOrcamentos(Array.isArray(data) ? data : []); setCarregando(false) })
      .catch(() => setCarregando(false))
  }, [])

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '8px 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Orçamentos
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''} cadastrado{orcamentos.length !== 1 ? 's' : ''}
          </p>
        </div>
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
            Nenhum orçamento ainda
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            Crie seu primeiro orçamento clicando em "+ Novo orçamento"
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
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{orc.clienteNome}</p>
                      {orc.clienteEmpresa && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{orc.clienteEmpresa}</p>}
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
    </div>
  )
}
