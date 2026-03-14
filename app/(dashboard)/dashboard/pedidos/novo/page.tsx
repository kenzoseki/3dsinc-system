'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

interface Cliente {
  id: string
  nome: string
  empresa: string | null
}

const schemaPedido = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  prioridade: z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']),
  prazoEntrega: z.string().optional(),
  valorTotal: z.string().optional(),
  observacoes: z.string().optional(),
})

type ErrosFormulario = Partial<Record<keyof z.infer<typeof schemaPedido>, string>>

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)',
  backgroundColor: '#fff',
  outline: 'none',
}

const estiloLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: '6px',
}

export default function PaginaNovoPedido() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [erros, setErros] = useState<ErrosFormulario>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function buscarClientes() {
      try {
        const resposta = await fetch('/api/clientes')
        if (resposta.ok) {
          const dados = await resposta.json()
          setClientes(dados)
        }
      } catch {
        // Silencioso
      } finally {
        setCarregandoClientes(false)
      }
    }
    buscarClientes()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErros({})
    setErroGeral('')

    const dadosFormulario = { clienteId, descricao, prioridade, prazoEntrega, valorTotal, observacoes }
    const validacao = schemaPedido.safeParse(dadosFormulario)

    if (!validacao.success) {
      const novosErros: ErrosFormulario = {}
      for (const issue of validacao.error.issues) {
        const campo = issue.path[0] as keyof ErrosFormulario
        novosErros[campo] = issue.message
      }
      setErros(novosErros)
      return
    }

    setEnviando(true)

    try {
      const payload: Record<string, unknown> = { clienteId, descricao, prioridade }
      if (prazoEntrega) payload.prazoEntrega = new Date(prazoEntrega).toISOString()
      if (valorTotal) payload.valorTotal = parseFloat(valorTotal)
      if (observacoes) payload.observacoes = observacoes

      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErroGeral(dados.erro ?? 'Erro ao criar pedido')
      } else {
        router.push('/dashboard/pedidos')
      }
    } catch {
      setErroGeral('Erro de comunicação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Novo Pedido
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Preencha os dados do pedido
        </p>
      </div>

      <div style={{
        padding: '28px',
        borderRadius: '10px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <form onSubmit={handleSubmit}>
          {/* Cliente */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <option value="">
                {carregandoClientes ? 'Carregando...' : 'Selecione um cliente'}
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.empresa ? ` (${c.empresa})` : ''}
                </option>
              ))}
            </select>
            {erros.clienteId && (
              <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.clienteId}</p>
            )}
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Descrição *</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o pedido..."
              style={{ ...estiloInput, resize: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {erros.descricao && (
              <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.descricao}</p>
            )}
          </div>

          {/* Prioridade e Prazo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={estiloLabel}>Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label style={estiloLabel}>Prazo de Entrega</label>
              <input
                type="date"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Valor Total */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Valor Total (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="0,00"
              style={{ ...estiloInput, fontFamily: 'JetBrains Mono, monospace' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Observações */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Observações adicionais..."
              style={{ ...estiloInput, resize: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Erro geral */}
          {erroGeral && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              backgroundColor: 'var(--red-light)',
              color: 'var(--red)',
              marginBottom: '18px',
            }}>
              {erroGeral}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 600,
                backgroundColor: enviando ? 'var(--purple-dark)' : 'var(--purple)',
                color: '#fff',
                border: 'none',
                cursor: enviando ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {enviando ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
