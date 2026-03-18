'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Cargo } from '@prisma/client'
import { Permissoes } from '@/lib/permissoes'

interface Lead {
  id:          string
  nome:        string
  empresa:     string | null
  email:        string | null
  telefone:    string | null
  etapa:       EtapaLead
  valor:       number | null
  observacoes: string | null
  responsavel: string | null
  updatedAt:   string
}

type EtapaLead = 'PROSPECTO' | 'NEGOCIACAO' | 'FECHADO' | 'PERDIDO'

const ETAPAS: { valor: EtapaLead; label: string; bg: string; cor: string; icone: string }[] = [
  { valor: 'PROSPECTO',  label: 'Prospecto',  bg: '#F3F2EF', cor: '#6B6860', icone: '🎯' },
  { valor: 'NEGOCIACAO', label: 'Negociação', bg: '#FEF3E2', cor: '#8A5A0A', icone: '💬' },
  { valor: 'FECHADO',    label: 'Fechado',    bg: '#E8F5EE', cor: '#1A6B42', icone: '✅' },
  { valor: 'PERDIDO',    label: 'Perdido',    bg: '#FCE9E9', cor: '#B83232', icone: '❌' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formVazio = { nome: '', empresa: '', email: '', telefone: '', etapa: 'PROSPECTO' as EtapaLead, valor: '', observacoes: '', responsavel: '' }

export default function PaginaCRM() {
  const { data: session } = useSession()
  const [leads, setLeads]           = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null)
  const [form, setForm]             = useState(formVazio)
  const [salvando, setSalvando]     = useState(false)
  const [erroModal, setErroModal]   = useState('')
  const [movendo, setMovendo]       = useState<string | null>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [etapaAlvo, setEtapaAlvo]       = useState<EtapaLead | null>(null)

  const cargo = session?.user?.cargo as Cargo | undefined
  const podeEditar = cargo ? Permissoes.podeEscreverPedidos(cargo) : false

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/leads')
      if (res.ok) setLeads(await res.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() {
    setLeadEditando(null)
    setForm(formVazio)
    setErroModal('')
    setModalAberto(true)
  }

  function abrirEditar(lead: Lead) {
    setLeadEditando(lead)
    setForm({
      nome:        lead.nome,
      empresa:     lead.empresa ?? '',
      email:       lead.email ?? '',
      telefone:    lead.telefone ?? '',
      etapa:       lead.etapa,
      valor:       lead.valor != null ? String(lead.valor) : '',
      observacoes: lead.observacoes ?? '',
      responsavel: lead.responsavel ?? '',
    })
    setErroModal('')
    setModalAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErroModal('Nome é obrigatório'); return }
    setSalvando(true)
    setErroModal('')
    try {
      const payload = {
        nome:        form.nome.trim(),
        empresa:     form.empresa.trim() || null,
        email:       form.email.trim() || null,
        telefone:    form.telefone.trim() || null,
        etapa:       form.etapa,
        valor:       form.valor ? parseFloat(form.valor) : null,
        observacoes: form.observacoes.trim() || null,
        responsavel: form.responsavel.trim() || null,
      }
      const url    = leadEditando ? `/api/leads/${leadEditando.id}` : '/api/leads'
      const method = leadEditando ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const d = await res.json()
        setErroModal(d.erro ?? 'Erro ao salvar')
        return
      }
      setModalAberto(false)
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function moverEtapa(lead: Lead, novaEtapa: EtapaLead) {
    if (lead.etapa === novaEtapa) return
    setMovendo(lead.id)
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: novaEtapa }),
      })
      carregar()
    } finally {
      setMovendo(null)
    }
  }

  async function excluir(lead: Lead) {
    if (!confirm(`Excluir "${lead.nome}"?`)) return
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    carregar()
  }

  const leadsPorEtapa = (etapa: EtapaLead) => leads.filter(l => l.etapa === etapa)
  const receitaEtapa  = (etapa: EtapaLead) => leads.filter(l => l.etapa === etapa).reduce((s, l) => s + (l.valor ?? 0), 0)

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            CRM — Pipeline de Vendas
          </h1>
          {!carregando && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {leads.filter(l => l.etapa !== 'PERDIDO').length} lead{leads.filter(l => l.etapa !== 'PERDIDO').length !== 1 ? 's' : ''} ativos
              {receitaEtapa('FECHADO') > 0 && ` · ${brl(receitaEtapa('FECHADO'))} em negócios fechados`}
            </p>
          )}
        </div>
        {podeEditar && (
          <button
            onClick={abrirNovo}
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
        /* Pipeline kanban */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'start' }}>
          {ETAPAS.map(etapa => {
            const lista   = leadsPorEtapa(etapa.valor)
            const receita = receitaEtapa(etapa.valor)
            const ehAlvo  = etapaAlvo === etapa.valor && arrastandoId !== null
            return (
              <div
                key={etapa.valor}
                onDragOver={e => { e.preventDefault(); setEtapaAlvo(etapa.valor) }}
                onDragLeave={() => setEtapaAlvo(null)}
                onDrop={e => {
                  e.preventDefault()
                  setEtapaAlvo(null)
                  const lead = leads.find(l => l.id === arrastandoId)
                  if (lead && lead.etapa !== etapa.valor) moverEtapa(lead, etapa.valor)
                  setArrastandoId(null)
                }}
              >
                {/* Cabeçalho da coluna */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px' }}>{etapa.icone}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {etapa.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px',
                    fontSize: '11px', fontWeight: 600,
                    background: etapa.bg, color: etapa.cor,
                  }}>
                    {lista.length}
                  </span>
                </div>
                {receita > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 10px' }}>
                    {brl(receita)}
                  </p>
                )}

                {/* Cards */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  minHeight: '60px', borderRadius: '10px', padding: '4px',
                  transition: 'background 0.15s',
                  background: ehAlvo ? etapa.bg : 'transparent',
                  outline: ehAlvo ? `2px dashed ${etapa.cor}` : 'none',
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
                      onDragEnd={() => { setArrastandoId(null); setEtapaAlvo(null) }}
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
                          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.nome}
                          </p>
                          {lead.empresa && (
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.empresa}
                            </p>
                          )}
                        </div>
                        {podeEditar && (
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => abrirEditar(lead)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', padding: '0 2px' }}
                            >
                              ✏
                            </button>
                            <button
                              onClick={() => excluir(lead)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B83232', fontSize: '13px', padding: '0 2px' }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {lead.valor != null && (
                        <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 600, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {brl(lead.valor)}
                        </p>
                      )}

                      {lead.responsavel && (
                        <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                          👤 {lead.responsavel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '500px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
                {leadEditando ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { campo: 'nome',        label: 'Nome *',       placeholder: 'Nome do contato' },
                { campo: 'empresa',     label: 'Empresa',      placeholder: 'Razão social' },
                { campo: 'email',       label: 'Email',        placeholder: 'email@exemplo.com' },
                { campo: 'telefone',    label: 'Telefone',     placeholder: '(11) 99999-0000' },
                { campo: 'responsavel', label: 'Responsável',  placeholder: 'Nome do vendedor' },
                { campo: 'valor',       label: 'Valor (R$)',   placeholder: '0.00' },
              ].map(({ campo, label, placeholder }) => (
                <div key={campo}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                    {label}
                  </label>
                  <input
                    type={campo === 'email' ? 'email' : campo === 'valor' ? 'number' : 'text'}
                    step={campo === 'valor' ? '0.01' : undefined}
                    placeholder={placeholder}
                    value={form[campo as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                  Etapa
                </label>
                <select
                  value={form.etapa}
                  onChange={e => setForm(f => ({ ...f, etapa: e.target.value as EtapaLead }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', outline: 'none' }}
                >
                  {ETAPAS.map(e => <option key={e.valor} value={e.valor}>{e.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                  Observações
                </label>
                <textarea
                  placeholder="Notas sobre o lead..."
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {erroModal && <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{erroModal}</p>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: salvando ? 'var(--border)' : 'var(--purple)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {salvando ? 'Salvando...' : leadEditando ? 'Salvar' : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
