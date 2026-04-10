'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Cargo } from '@prisma/client'
import { Permissoes } from '@/lib/permissoes'

interface Lead {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  etapa: EtapaLead
  valor: number | null
  observacoes: string | null
  responsavel: string | null
  createdAt: string
  updatedAt: string
}

type EtapaLead = 'PROSPECTO' | 'NEGOCIACAO' | 'FECHADO' | 'PERDIDO'

const COLUNAS: { valor: EtapaLead; label: string; bg: string; cor: string }[] = [
  { valor: 'PROSPECTO',  label: 'Prospecto',   bg: 'var(--purple-light)', cor: 'var(--purple)' },
  { valor: 'NEGOCIACAO', label: 'Negociação',   bg: 'var(--amber-light)',  cor: 'var(--amber)' },
  { valor: 'FECHADO',    label: 'Fechado',      bg: 'var(--green-light)',  cor: 'var(--green)' },
  { valor: 'PERDIDO',    label: 'Perdido',      bg: 'var(--red-light)',    cor: 'var(--red)' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formVazio = {
  nome: '', empresa: '', email: '', telefone: '',
  valor: '', observacoes: '', responsavel: '',
}

export default function PaginaCRM() {
  const { data: session } = useSession()
  const [leads, setLeads] = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [movendo, setMovendo] = useState<string | null>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<EtapaLead | null>(null)

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const cargo = session?.user?.cargo as Cargo | undefined
  const podeEditar = cargo ? Permissoes.podeEscreverPedidos(cargo) : false

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/leads')
      if (res.ok) {
        const dados = await res.json()
        setLeads(Array.isArray(dados) ? dados : [])
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovoLead() {
    setEditandoId(null)
    setForm(formVazio)
    setErroModal('')
    setModalAberto(true)
  }

  function abrirEditarLead(lead: Lead) {
    setEditandoId(lead.id)
    setForm({
      nome: lead.nome,
      empresa: lead.empresa ?? '',
      email: lead.email ?? '',
      telefone: lead.telefone ?? '',
      valor: lead.valor != null ? String(lead.valor) : '',
      observacoes: lead.observacoes ?? '',
      responsavel: lead.responsavel ?? '',
    })
    setErroModal('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setTimeout(() => {
      setForm(formVazio)
      setEditandoId(null)
      setErroModal('')
    }, 200)
  }

  async function salvarLead(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErroModal('Nome é obrigatório.'); return }
    setSalvando(true)
    setErroModal('')

    const payload = {
      nome: form.nome.trim(),
      empresa: form.empresa.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      valor: form.valor ? Number(form.valor) : null,
      observacoes: form.observacoes.trim() || null,
      responsavel: form.responsavel.trim() || null,
    }

    try {
      const url = editandoId ? `/api/leads/${editandoId}` : '/api/leads'
      const method = editandoId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        setErroModal(d.erro ?? 'Erro ao salvar.')
        return
      }
      fecharModal()
      carregar()
    } catch {
      setErroModal('Erro de conexão.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirLead(id: string) {
    if (!confirm('Excluir este lead permanentemente?')) return
    const r = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    if (!r.ok) { alert('Erro ao excluir lead'); return }
    carregar()
  }

  async function moverEtapa(lead: Lead, novaEtapa: EtapaLead) {
    if (lead.etapa === novaEtapa) return
    setMovendo(lead.id)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: novaEtapa }),
      })
      if (res.ok) carregar()
    } finally {
      setMovendo(null)
    }
  }

  const porEtapa = (etapa: EtapaLead) => leads.filter(l => l.etapa === etapa)
  const totalEtapa = (etapa: EtapaLead) => porEtapa(etapa).reduce((s, l) => s + Number(l.valor ?? 0), 0)

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            CRM — Pipeline de Leads
          </h1>
          {!carregando && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
              {leads.filter(l => l.etapa !== 'PERDIDO').length} lead{leads.filter(l => l.etapa !== 'PERDIDO').length !== 1 ? 's' : ''} ativo{leads.filter(l => l.etapa !== 'PERDIDO').length !== 1 ? 's' : ''}
              {totalEtapa('FECHADO') > 0 && ` · ${brl(totalEtapa('FECHADO'))} fechados`}
            </p>
          )}
        </div>
        {podeEditar && (
          <button
            onClick={abrirNovoLead}
            style={{
              background: 'var(--purple)', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '9px 18px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            + Novo Lead
          </button>
        )}
      </div>

      {carregando ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Carregando...
        </div>
      ) : (
        <div className="crm-kanban-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'start' }}>
          {COLUNAS.map(col => {
            const lista = porEtapa(col.valor)
            const total = totalEtapa(col.valor)
            const ehAlvo = colunaAlvo === col.valor && arrastandoId !== null
            return (
              <div
                key={col.valor}
                onDragOver={e => { e.preventDefault(); setColunaAlvo(col.valor) }}
                onDragLeave={() => setColunaAlvo(null)}
                onDrop={e => {
                  e.preventDefault()
                  setColunaAlvo(null)
                  const lead = leads.find(l => l.id === arrastandoId)
                  if (lead && lead.etapa !== col.valor && podeEditar) moverEtapa(lead, col.valor)
                  setArrastandoId(null)
                }}
              >
                {/* Cabeçalho da coluna */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {col.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px',
                    fontSize: '11px', fontWeight: 600,
                    background: col.bg, color: col.cor,
                  }}>
                    {lista.length}
                  </span>
                </div>
                {total > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 10px' }}>
                    {brl(total)}
                  </p>
                )}

                {/* Cards */}
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
                      Nenhum lead
                    </div>
                  ) : lista.map(lead => (
                    <div
                      key={lead.id}
                      draggable={podeEditar}
                      onDragStart={() => setArrastandoId(lead.id)}
                      onDragEnd={() => { setArrastandoId(null); setColunaAlvo(null) }}
                      style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '14px',
                        opacity: (movendo === lead.id || arrastandoId === lead.id) ? 0.4 : 1,
                        transition: 'opacity 0.15s',
                        cursor: podeEditar ? 'grab' : 'default',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                            fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {lead.nome}
                          </p>
                          {lead.empresa && (
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                              {lead.empresa}
                            </p>
                          )}
                        </div>
                        {podeEditar && (
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => abrirEditarLead(lead)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 4px',
                                borderRadius: '4px',
                              }}
                              title="Editar lead"
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--purple)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => excluirLead(lead.id)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 4px',
                                borderRadius: '4px',
                              }}
                              title="Excluir lead"
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                          {lead.responsavel ?? '—'}
                        </span>
                        {lead.valor != null && Number(lead.valor) > 0 && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {brl(Number(lead.valor))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Novo / Editar Lead */}
      {modalAberto && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) fecharModal() }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div className="modal-content" style={{
            background: 'var(--bg-surface)', borderRadius: '16px', padding: '28px',
            width: '100%', maxWidth: '480px', border: '1px solid var(--border)',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
                {editandoId ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>

            <form onSubmit={salvarLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { campo: 'nome', label: 'Nome *', placeholder: 'Nome do lead', tipo: 'text' },
                { campo: 'empresa', label: 'Empresa', placeholder: 'Razão social ou nome fantasia', tipo: 'text' },
                { campo: 'email', label: 'Email', placeholder: 'email@exemplo.com', tipo: 'email' },
                { campo: 'telefone', label: 'Telefone', placeholder: '(11) 99999-0000', tipo: 'text' },
                { campo: 'valor', label: 'Valor estimado (R$)', placeholder: '0,00', tipo: 'number' },
                { campo: 'responsavel', label: 'Responsável', placeholder: 'Quem está cuidando', tipo: 'text' },
              ].map(({ campo, label, placeholder, tipo }) => (
                <div key={campo}>
                  <label style={{
                    display: 'block', fontSize: '12px', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: '6px',
                    textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                  }}>
                    {label}
                  </label>
                  <input
                    type={tipo}
                    placeholder={placeholder}
                    value={form[campo as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    step={tipo === 'number' ? '0.01' : undefined}
                    min={tipo === 'number' ? '0' : undefined}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--bg-page)',
                      fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                </div>
              ))}

              {/* Observações (textarea) */}
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  color: 'var(--text-secondary)', marginBottom: '6px',
                  textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                }}>
                  Observações
                </label>
                <textarea
                  placeholder="Notas, contexto, próximos passos..."
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  maxLength={2000}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--bg-page)',
                    fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>

              {erroModal && <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{erroModal}</p>}

              <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={fecharModal}
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
                  {salvando ? 'Salvando...' : (editandoId ? 'Salvar' : 'Criar Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
