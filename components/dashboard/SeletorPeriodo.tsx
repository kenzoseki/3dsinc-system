'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const opcoes = [
  { valor: 'hoje',      label: 'Hoje' },
  { valor: 'semana',    label: 'Esta semana' },
  { valor: 'mes',       label: 'Este mês' },
  { valor: 'trimestre', label: 'Últimos 3 meses' },
  { valor: 'ano',       label: 'Este ano' },
]

export function SeletorPeriodo() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodoAtual = searchParams.get('periodo') ?? 'mes'
  const [isPending, startTransition] = useTransition()

  function selecionar(valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', valor)
    startTransition(() => {
      router.replace(`/dashboard?${params.toString()}`)
    })
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
      {opcoes.map((op) => {
        const ativo = periodoAtual === op.valor
        return (
          <button
            key={op.valor}
            onClick={() => selecionar(op.valor)}
            disabled={isPending}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: ativo ? 500 : 400,
              cursor: isPending ? 'wait' : 'pointer',
              border: ativo ? '1px solid var(--purple)' : '1px solid var(--border)',
              backgroundColor: ativo ? 'var(--purple-light)' : 'var(--bg-surface)',
              color: ativo ? 'var(--purple-text)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {op.label}
          </button>
        )
      })}
    </div>
  )
}
