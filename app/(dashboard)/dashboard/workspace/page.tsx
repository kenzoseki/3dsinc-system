'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

type Etapa = 'SOLICITACAO' | 'CUSTO_VIABILIDADE' | 'APROVACAO' | 'PRODUCAO' | 'ENVIADO' | 'FINALIZADO' | 'CANCELADO'

interface ItemWS {
  id: string
  descricao: string
  referencia: string | null
  quantidade: number
  valorUnitario: number | null
}

interface Solicitacao {
  id: string
  numero: number
  etapa: Etapa
  clienteNome: string
  clienteEmail: string | null
  clienteTelefone: string | null
  tipoPessoa: string | null
  infoAdicional: string | null
  observacoes: string | null
  createdAt: string
  itens: ItemWS[]
}

// Etapas ativas (colunas do kanban)
const ETAPAS_ATIVAS: Etapa[] = ['SOLICITACAO', 'CUSTO_VIABILIDADE', 'APROVACAO', 'PRODUCAO', 'ENVIADO']
// Etapas terminais (abas separadas)
const ETAPAS_TERMINAIS: Etapa[] = ['FINALIZADO', 'CANCELADO']

const labelEtapa: Record<Etapa, string> = {
  SOLICITACAO:      'Solicitação',
  CUSTO_VIABILIDADE:'Custo e Viabilidade',
  APROVACAO:        'Aprovação',
  PRODUCAO:         'Produção',
  ENVIADO:          'Enviado',
  FINALIZADO:       'Finalizado',
  CANCELADO:        'Cancelado',
}

const corEtapa: Record<Etapa, { borda: string; header: string; texto: string }> = {
  SOLICITACAO:      { borda: '#5B47C8', header: '#EDE9FC', texto: '#4C3DB5' },
  CUSTO_VIABILIDADE:{ borda: '#8A5A0A', header: '#FEF3E2', texto: '#8A5A0A' },
  APROVACAO:        { borda: '#1A6B42', header: '#E8F5EE', texto: '#1A6B42' },
  PRODUCAO:         { borda: '#4C3DB5', header: '#EDE9FC', texto: '#4C3DB5' },
  ENVIADO:          { borda: '#6B6860', header: '#F3F2EF', texto: '#6B6860' },
  FINALIZADO:       { borda: '#1A6B42', header: '#E8F5EE', texto: '#1A6B42' },
  CANCELADO:        { borda: '#B83232', header: '#FCE9E9', texto: '#B83232' },
}

const PROXIMA_ETAPA: Partial<Record<Etapa, Etapa>> = {
  SOLICITACAO:       'CUSTO_VIABILIDADE',
  CUSTO_VIABILIDADE: 'APROVACAO',
  APROVACAO:         'PRODUCAO',
  PRODUCAO:          'ENVIADO',
  ENVIADO:           'FINALIZADO',
}

const estiloInput: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)', backgroundColor: '#fff', outline: 'none',
  boxSizing: 'border-box',
}
const estiloLabel: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: '4px', fontFamily: 'Inter, sans-serif',
}

export default function PaginaWorkspace() {
  const { data: session } = useSession()
  const router = useRouter()

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaTerminal, setAbaTerminal] = useState<Etapa | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<Solicitacao | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  // Form state
  const [form, setForm] = useState({
    clienteNome: '', clienteEmail: '', clienteTelefone: '', tipoPessoa: '' as '' | 'PF' | 'PJ',
    observacoes: '', infoAdicional: '',
  })
  const [itens, setItens] = useState<{ descricao: string; referencia: string; quantidade: number; valorUnitario: string }[]>([
    { descricao: '', referencia: '', quantidade: 1, valorUnitario: '' },
  ])

  const cargo = session?.user?.cargo

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/workspace')
      if (r.ok) setSolicitacoes(await r.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (cargo) carregar()
  }, [cargo, carregar])

  if (!cargo) return null

  function soliPorEtapa(etapa: Etapa) {
    return solicitacoes.filter(s => s.etapa === etapa)
  }

  async function avancarEtapa(id: string, novaEtapa: Etapa) {
    const r = await fetch(`/api/workspace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: novaEtapa }),
    })
    if (r.ok) {
      const atualizado = await r.json()
      setSolicitacoes(prev => prev.map(s => s.id === id ? atualizado : s))
      if (detalheAberto?.id === id) setDetalheAberto(atualizado)
    }
  }

  async function cancelar(id: string) {
    await avancarEtapa(id, 'CANCELADO')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta solicitação permanentemente?')) return
    const r = await fetch(`/api/workspace/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setSolicitacoes(prev => prev.filter(s => s.id !== id))
      if (detalheAberto?.id === id) setDetalheAberto(null)
    }
  }

  function addItem() {
    setItens(prev => [...prev, { descricao: '', referencia: '', quantidade: 1, valorUnitario: '' }])
  }

  function removeItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function setItem(idx: number, campo: string, valor: string | number) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  async function criarSolicitacao(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clienteNome.trim()) return
    setSalvando(true)
    setMensagem('')
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome:     form.clienteNome.trim(),
          clienteEmail:    form.clienteEmail || null,
          clienteTelefone: form.clienteTelefone || null,
          tipoPessoa:      form.tipoPessoa || null,
          observacoes:     form.observacoes || null,
          itens: itens.filter(it => it.descricao.trim()).map(it => ({
            descricao:    it.descricao.trim(),
            referencia:   it.referencia || null,
            quantidade:   it.quantidade,
            valorUnitario: it.valorUnitario ? parseFloat(it.valorUnitario) : null,
          })),
        }),
      })
      if (r.ok) {
        const nova = await r.json()
        setSolicitacoes(prev => [nova, ...prev])
        setModalAberto(false)
        setForm({ clienteNome: '', clienteEmail: '', clienteTelefone: '', tipoPessoa: '', observacoes: '', infoAdicional: '' })
        setItens([{ descricao: '', referencia: '', quantidade: 1, valorUnitario: '' }])
      } else {
        const dados = await r.json()
        setMensagem('✗ ' + (dados.erro ?? 'Erro ao criar'))
        setTimeout(() => setMensagem(''), 4000)
      }
    } finally {
      setSalvando(false)
    }
  }

  async function salvarDetalhes() {
    if (!detalheAberto) return
    setSalvando(true)
    try {
      const r = await fetch(`/api/workspace/${detalheAberto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infoAdicional: detalheAberto.infoAdicional,
          observacoes:   detalheAberto.observacoes,
          itens: detalheAberto.itens.map(it => ({
            descricao:    it.descricao,
            referencia:   it.referencia,
            quantidade:   it.quantidade,
            valorUnitario: it.valorUnitario,
          })),
        }),
      })
      if (r.ok) {
        const atualizado = await r.json()
        setSolicitacoes(prev => prev.map(s => s.id === atualizado.id ? atualizado : s))
        setDetalheAberto(atualizado)
        setMensagem('✓ Salvo')
        setTimeout(() => setMensagem(''), 2000)
      }
    } finally {
      setSalvando(false)
    }
  }

  const totalAtivos = ETAPAS_ATIVAS.reduce((acc, e) => acc + soliPorEtapa(e).length, 0)
  const totalFinalizados = soliPorEtapa('FINALIZADO').length
  const totalCancelados  = soliPorEtapa('CANCELADO').length

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
            Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px', marginTop: '2px' }}>
            {totalAtivos} ativo{totalAtivos !== 1 ? 's' : ''} · {totalFinalizados} finalizado{totalFinalizados !== 1 ? 's' : ''} · {totalCancelados} cancelado{totalCancelados !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          + Nova Solicitação
        </button>
      </div>

      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', backgroundColor: mensagem.startsWith('✓') ? 'var(--green-light)' : 'var(--red-light)', color: mensagem.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
          {mensagem}
        </div>
      )}

      {/* Abas terminais */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setAbaTerminal(null)}
          style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: abaTerminal === null ? 600 : 400, border: '1px solid var(--border)', backgroundColor: abaTerminal === null ? 'var(--purple-light)' : 'transparent', color: abaTerminal === null ? 'var(--purple-text)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Fluxo Ativo
        </button>
        {ETAPAS_TERMINAIS.map(e => (
          <button
            key={e}
            onClick={() => setAbaTerminal(abaTerminal === e ? null : e)}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: abaTerminal === e ? 600 : 400, border: '1px solid var(--border)', backgroundColor: abaTerminal === e ? corEtapa[e].header : 'transparent', color: abaTerminal === e ? corEtapa[e].texto : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {labelEtapa[e]} ({soliPorEtapa(e).length})
          </button>
        ))}
      </div>

      {/* Vista de abas terminais */}
      {abaTerminal !== null ? (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          {carregando ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Carregando...</p>
          ) : soliPorEtapa(abaTerminal).length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Nenhuma solicitação {labelEtapa[abaTerminal].toLowerCase()}.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  {['#', 'Cliente', 'Tipo', 'Itens', 'Data', 'Ações'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {soliPorEtapa(abaTerminal).map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < soliPorEtapa(abaTerminal).length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>#{s.numero}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, color: 'var(--text-primary)' }}>{s.clienteNome}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.tipoPessoa && (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                          {s.tipoPessoa}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>{s.itens.length} item{s.itens.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setDetalheAberto(s)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          Ver
                        </button>
                        <button onClick={() => excluir(s.id)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Kanban — etapas ativas */
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', alignItems: 'flex-start' }}>
          {ETAPAS_ATIVAS.map(etapa => {
            const cards = soliPorEtapa(etapa)
            const cor = corEtapa[etapa]
            return (
              <div
                key={etapa}
                style={{ minWidth: '240px', flex: '1 1 240px', borderRadius: '10px', border: `1.5px solid ${cor.borda}22`, backgroundColor: 'var(--bg-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {/* Header da coluna */}
                <div style={{ padding: '10px 12px', borderRadius: '8px 8px 0 0', backgroundColor: cor.header, borderBottom: `1.5px solid ${cor.borda}33`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: cor.texto }}>
                    {labelEtapa[etapa]}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: cor.texto, backgroundColor: `${cor.borda}22`, padding: '1px 7px', borderRadius: '10px' }}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {carregando ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '12px 4px', textAlign: 'center' }}>Carregando...</p>
                  ) : cards.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '12px 4px', textAlign: 'center', fontStyle: 'italic' }}>Vazio</p>
                  ) : cards.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setDetalheAberto(s)}
                      style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', transition: 'box-shadow 0.12s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>#{s.numero}</span>
                        {s.tipoPessoa && (
                          <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                            {s.tipoPessoa}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>{s.clienteNome}</p>
                      {s.itens.length > 0 && (
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                          {s.itens.length} item{s.itens.length !== 1 ? 's' : ''}
                          {s.itens.some(it => it.valorUnitario) && (
                            <> · R$ {s.itens.reduce((acc, it) => acc + (it.valorUnitario ?? 0) * it.quantidade, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                          )}
                        </p>
                      )}
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', marginTop: '6px' }}>
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — nova solicitação (portaled to body) */}
      {modalAberto && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) { setModalAberto(false) } }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '28px' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Nova Solicitação
            </h2>

            <form onSubmit={criarSolicitacao}>
              {/* Cliente */}
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Cliente
              </p>
              <div style={{ marginBottom: '12px' }}>
                <label style={estiloLabel}>Nome do cliente *</label>
                <input
                  style={estiloInput} value={form.clienteNome} required
                  onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))}
                  placeholder="Nome completo ou razão social"
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={estiloLabel}>E-mail</label>
                  <input style={estiloInput} type="email" value={form.clienteEmail} onChange={e => setForm(f => ({ ...f, clienteEmail: e.target.value }))} placeholder="email@exemplo.com"
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label style={estiloLabel}>Telefone</label>
                  <input style={estiloInput} value={form.clienteTelefone} onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))} placeholder="(11) 99999-9999"
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={estiloLabel}>Tipo de pessoa</label>
                <select style={estiloInput} value={form.tipoPessoa} onChange={e => setForm(f => ({ ...f, tipoPessoa: e.target.value as '' | 'PF' | 'PJ' }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <option value="">Não informado</option>
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </div>

              {/* Itens */}
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Itens Solicitados
              </p>
              {itens.map((it, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ flex: 3 }}>
                      <label style={estiloLabel}>Descrição</label>
                      <input style={estiloInput} value={it.descricao} onChange={e => setItem(idx, 'descricao', e.target.value)} placeholder="Ex.: Peça de suporte"
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={estiloLabel}>Qtd.</label>
                      <input style={estiloInput} type="number" min={1} value={it.quantidade} onChange={e => setItem(idx, 'quantidade', parseInt(e.target.value) || 1)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </div>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} style={{ alignSelf: 'flex-end', padding: '8px', borderRadius: '6px', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '12px', marginBottom: '0' }}>
                        ✕
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={estiloLabel}>Referência / Arquivo</label>
                    <input style={estiloInput} value={it.referencia} onChange={e => setItem(idx, 'referencia', e.target.value)} placeholder="Link, descrição de arquivo..."
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} style={{ width: '100%', padding: '7px', borderRadius: '7px', border: '1.5px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', marginBottom: '20px' }}>
                + Adicionar item
              </button>

              {/* Observações */}
              <div style={{ marginBottom: '20px' }}>
                <label style={estiloLabel}>Observações</label>
                <textarea style={{ ...estiloInput, resize: 'vertical', minHeight: '72px' }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais..."
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} style={{ flex: 2, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Criando...' : 'Criar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal — detalhe / edição (portaled to body) */}
      {detalheAberto && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setDetalheAberto(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '28px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  #{detalheAberto.numero} · {new Date(detalheAberto.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
                  {detalheAberto.clienteNome}
                </h2>
                <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: corEtapa[detalheAberto.etapa].header, color: corEtapa[detalheAberto.etapa].texto }}>
                  {labelEtapa[detalheAberto.etapa]}
                </span>
              </div>
              <button onClick={() => setDetalheAberto(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>✕</button>
            </div>

            {/* Info do cliente */}
            <div style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
              {detalheAberto.clienteEmail && <p style={{ margin: '0 0 4px' }}>✉ {detalheAberto.clienteEmail}</p>}
              {detalheAberto.clienteTelefone && <p style={{ margin: '0 0 4px' }}>☎ {detalheAberto.clienteTelefone}</p>}
              {detalheAberto.tipoPessoa && <p style={{ margin: 0 }}>Tipo: {detalheAberto.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>}
            </div>

            {/* Itens */}
            {detalheAberto.itens.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Itens</p>
                {detalheAberto.itens.map((it, i) => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)', borderRadius: '6px', marginBottom: '4px' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>{it.descricao}</p>
                      {it.referencia && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>{it.referencia}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', margin: '0 0 2px' }}>Qtd: {it.quantidade}</p>
                      {it.valorUnitario != null && (
                        <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', margin: 0 }}>
                          R$ {(it.valorUnitario * it.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {detalheAberto.itens.some(it => it.valorUnitario != null) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                      Total: R$ {detalheAberto.itens.reduce((acc, it) => acc + (it.valorUnitario ?? 0) * it.quantidade, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Info adicional (Custo e Viabilidade) */}
            {(detalheAberto.etapa !== 'SOLICITACAO') && (
              <div style={{ marginBottom: '16px' }}>
                <label style={estiloLabel}>Custo e Viabilidade — Informações adicionais</label>
                <textarea
                  style={{ ...estiloInput, resize: 'vertical', minHeight: '72px' }}
                  value={detalheAberto.infoAdicional ?? ''}
                  onChange={e => setDetalheAberto(d => d ? { ...d, infoAdicional: e.target.value } : d)}
                  placeholder="Custos por item, materiais, observações técnicas..."
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            )}

            {/* Observações */}
            <div style={{ marginBottom: '20px' }}>
              <label style={estiloLabel}>Observações</label>
              <textarea
                style={{ ...estiloInput, resize: 'vertical', minHeight: '60px' }}
                value={detalheAberto.observacoes ?? ''}
                onChange={e => setDetalheAberto(d => d ? { ...d, observacoes: e.target.value } : d)}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {PROXIMA_ETAPA[detalheAberto.etapa] && (
                <button
                  onClick={() => avancarEtapa(detalheAberto.id, PROXIMA_ETAPA[detalheAberto.etapa]!)}
                  style={{ flex: 2, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', minWidth: '160px' }}
                >
                  Avançar para {labelEtapa[PROXIMA_ETAPA[detalheAberto.etapa]!]}
                </button>
              )}
              <button
                onClick={salvarDetalhes}
                disabled={salvando}
                style={{ flex: 1, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              {!['FINALIZADO', 'CANCELADO'].includes(detalheAberto.etapa) && (
                <button
                  onClick={() => cancelar(detalheAberto.id)}
                  style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
