'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Cliente {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cpfCnpj: string | null
  createdAt: string
  _count: { pedidos: number }
}

interface Paginacao {
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

const LIMITE = 25

export default function PaginaClientes() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', empresa: '', cpfCnpj: '',
  })

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({
        paginado: 'true',
        pagina: String(pagina),
        limite: String(LIMITE),
      })
      if (busca) params.set('busca', busca)
      const res = await fetch(`/api/clientes?${params}`)
      if (res.ok) {
        const dados = await res.json()
        setClientes(dados.clientes)
        setPaginacao(dados.paginacao)
      }
    } finally {
      setCarregando(false)
    }
  }, [pagina, busca])

  useEffect(() => { carregar() }, [carregar])

  function handleBusca(e: React.FormEvent) {
    e.preventDefault()
    setBusca(buscaInput)
    setPagina(1)
  }

  function abrirModal() {
    setForm({ nome: '', email: '', telefone: '', empresa: '', cpfCnpj: '' })
    setErroModal('')
    setModalAberto(true)
  }

  async function criarCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErroModal('Nome é obrigatório'); return }
    setSalvando(true)
    setErroModal('')
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
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
        setErroModal(dados.erro ?? 'Erro ao criar cliente')
        return
      }
      setModalAberto(false)
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Cabeçalho */}
      <div className="cabecalho-pagina" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
            Clientes
          </h1>
          {paginacao && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {paginacao.total} cliente{paginacao.total !== 1 ? 's' : ''} cadastrado{paginacao.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={abrirModal}
          style={{
            background: 'var(--purple)', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '10px 18px', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          + Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <form onSubmit={handleBusca} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por nome, empresa ou email..."
          value={buscaInput}
          onChange={e => setBuscaInput(e.target.value)}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--bg-surface)', fontSize: '14px', color: 'var(--text-primary)',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Buscar
        </button>
        {busca && (
          <button
            type="button"
            onClick={() => { setBuscaInput(''); setBusca(''); setPagina(1) }}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', fontSize: '13px', color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Limpar
          </button>
        )}
      </form>

      {/* Tabela */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Carregando...
          </div>
        ) : clientes.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              {busca ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                {['Nome', 'Empresa', 'Email', 'Telefone', 'Pedidos'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                  style={{
                    borderBottom: i < clientes.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {c.nome}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {c.empresa ?? '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {c.email ?? '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {c.telefone ?? '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                      fontSize: '12px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                      background: c._count.pedidos > 0 ? 'var(--purple-light)' : 'var(--bg-page)',
                      color: c._count.pedidos > 0 ? 'var(--purple-text)' : 'var(--text-secondary)',
                    }}>
                      {c._count.pedidos}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      {/* Modal novo cliente */}
      {modalAberto && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '16px', padding: '28px',
            width: '100%', maxWidth: '480px', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
                Novo Cliente
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={criarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { campo: 'nome', label: 'Nome *', placeholder: 'Nome do cliente' },
                { campo: 'empresa', label: 'Empresa', placeholder: 'Razão social ou nome fantasia' },
                { campo: 'email', label: 'Email', placeholder: 'email@exemplo.com' },
                { campo: 'telefone', label: 'Telefone', placeholder: '(11) 99999-0000' },
                { campo: 'cpfCnpj', label: 'CPF / CNPJ', placeholder: '000.000.000-00' },
              ].map(({ campo, label, placeholder }) => (
                <div key={campo}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                    {label}
                  </label>
                  <input
                    type={campo === 'email' ? 'email' : 'text'}
                    placeholder={placeholder}
                    value={form[campo as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--bg-page)',
                      fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              {erroModal && (
                <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{erroModal}</p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--bg-page)',
                    fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                    background: salvando ? 'var(--border)' : 'var(--purple)', color: '#fff',
                    fontSize: '14px', fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {salvando ? 'Salvando...' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
