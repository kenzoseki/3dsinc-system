'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'

const STATUS_LABEL: Record<string, string> = {
  ORCAMENTO: 'Orçamento', APROVADO: 'Aprovado', AGUARDANDO: 'Aguardando',
  EM_PRODUCAO: 'Em Produção', PAUSADO: 'Pausado', CONCLUIDO: 'Concluído',
  ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
}

const STATUS_COR: Record<string, { bg: string; cor: string }> = {
  ORCAMENTO: { bg: '#FCE9E9', cor: '#B83232' },
  APROVADO: { bg: '#FEF3E2', cor: '#8A5A0A' },
  AGUARDANDO: { bg: '#FEF3E2', cor: '#8A5A0A' },
  EM_PRODUCAO: { bg: '#EDE9FC', cor: '#4C3DB5' },
  PAUSADO: { bg: '#FCE9E9', cor: '#B83232' },
  CONCLUIDO: { bg: '#E8F5EE', cor: '#1A6B42' },
  ENTREGUE: { bg: '#E8F5EE', cor: '#1A6B42' },
  CANCELADO: { bg: '#F3F2EF', cor: '#6B6860' },
}

interface Pedido {
  id: string
  numero: number
  descricao: string
  status: string
  prioridade: string
  valorTotal: string | null
  prazoEntrega: string | null
  createdAt: string
}

interface Cliente {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cpfCnpj: string | null
  createdAt: string
  pedidos: Pedido[]
}

export default function PaginaDetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const cargo = session?.user?.cargo as Cargo | undefined
  const podeEditar = cargo ? Permissoes.podeEscreverClientes(cargo) : false
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', empresa: '', cpfCnpj: '' })

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/clientes/${id}`)
        if (!res.ok) { router.push('/workspace/clientes'); return }
        const dados: Cliente = await res.json()
        setCliente(dados)
        setForm({
          nome: dados.nome,
          email: dados.email ?? '',
          telefone: dados.telefone ?? '',
          empresa: dados.empresa ?? '',
          cpfCnpj: dados.cpfCnpj ?? '',
        })
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [id, router])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          empresa: form.empresa.trim() || null,
          cpfCnpj: form.cpfCnpj.trim() || null,
        }),
      })
      if (!res.ok) {
        const dados = await res.json()
        setErro(dados.erro ?? 'Erro ao salvar')
        return
      }
      const atualizado: Cliente = await res.json()
      setCliente(prev => prev ? { ...prev, ...atualizado } : null)
      setEditando(false)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    setExcluindo(true)
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const dados = await res.json()
        setErro(dados.erro ?? 'Erro ao excluir')
        setConfirmarExclusao(false)
        return
      }
      router.push('/workspace/clientes')
    } finally {
      setExcluindo(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
  }

  if (carregando) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Carregando...</div>
  }

  if (!cliente) return null

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Voltar */}
      <button
        onClick={() => router.push('/workspace/clientes')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0, fontFamily: 'Inter, sans-serif' }}
      >
        ← Voltar para Clientes
      </button>

      {/* Cabeçalho */}
      <div className="cabecalho-pagina" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
            {cliente.nome}
          </h1>
          {cliente.empresa && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
              {cliente.empresa}
            </p>
          )}
        </div>
        {podeEditar && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {!editando ? (
              <>
                <button
                  onClick={() => { setEditando(true); setErro('') }}
                  style={{
                    padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmarExclusao(true)}
                  style={{
                    padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--red-light)',
                    background: 'var(--red-light)', fontSize: '13px', color: 'var(--red)',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Excluir
                </button>
              </>
            ) : (
              <button
                onClick={() => { setEditando(false); setErro('') }}
                style={{
                  padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dados do cliente */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', margin: '0 0 20px' }}>
          Informações
        </h2>

        {editando ? (
          <form onSubmit={salvar}>
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { campo: 'nome', label: 'Nome *' },
                { campo: 'empresa', label: 'Empresa' },
                { campo: 'email', label: 'Email' },
                { campo: 'telefone', label: 'Telefone' },
                { campo: 'cpfCnpj', label: 'CPF / CNPJ' },
              ].map(({ campo, label }) => (
                <div key={campo}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type={campo === 'email' ? 'email' : 'text'}
                    value={form[campo as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {erro && <p style={{ color: 'var(--red)', fontSize: '13px', margin: '12px 0 0' }}>{erro}</p>}

            <div style={{ marginTop: '20px' }}>
              <button
                type="submit"
                disabled={salvando}
                style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: salvando ? 'var(--border)' : 'var(--purple)', color: '#fff',
                  fontSize: '14px', fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        ) : (
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Email', valor: cliente.email },
              { label: 'Telefone', valor: cliente.telefone },
              { label: 'Empresa', valor: cliente.empresa },
              { label: 'CPF / CNPJ', valor: cliente.cpfCnpj },
            ].map(({ label, valor }) => (
              <div key={label}>
                <p style={{ ...labelStyle, marginBottom: '4px' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '14px', color: valor ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                  {valor ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}

        {erro && !editando && <p style={{ color: 'var(--red)', fontSize: '13px', margin: '12px 0 0' }}>{erro}</p>}
      </div>

      {/* Histórico de pedidos */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
            Pedidos ({cliente.pedidos.length})
          </h2>
        </div>

        {cliente.pedidos.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Nenhum pedido para este cliente.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Descrição', 'Status', 'Valor', 'Data'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cliente.pedidos.map((p, i) => {
                const cor = STATUS_COR[p.status] ?? { bg: '#F3F2EF', cor: '#6B6860' }
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/workspace/pedidos/${p.id}`)}
                    style={{
                      borderBottom: i < cliente.pedidos.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                      #{String(p.numero).padStart(4, '0')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', maxWidth: '240px' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.descricao}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                        background: cor.bg, color: cor.cor,
                      }}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.valorTotal ? `R$ ${parseFloat(p.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal confirmação exclusão */}
      {confirmarExclusao && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setConfirmarExclusao(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
              Excluir cliente?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              Esta ação não pode ser desfeita. Clientes com pedidos vinculados não podem ser excluídos.
            </p>
            {erro && <p style={{ color: 'var(--red)', fontSize: '13px', margin: '0 0 12px' }}>{erro}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setConfirmarExclusao(false); setErro('') }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                disabled={excluindo}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--red)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: excluindo ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                {excluindo ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
