'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

type Etapa = 'IDEIA' | 'PLANEJAMENTO' | 'PRODUCAO' | 'REVISAO' | 'AGENDADO' | 'PUBLICADO'

interface CardMkt {
  id: string
  titulo: string
  descricao: string | null
  etapa: Etapa
  plataforma: string | null
  responsavel: string | null
  dataPublicacao: string | null
  imagemBase64: string | null
  observacoes: string | null
  createdAt: string
}

const ETAPAS: Etapa[] = ['IDEIA', 'PLANEJAMENTO', 'PRODUCAO', 'REVISAO', 'AGENDADO', 'PUBLICADO']

const labelEtapa: Record<Etapa, string> = {
  IDEIA: 'Ideia',
  PLANEJAMENTO: 'Planejamento',
  PRODUCAO: 'Produção',
  REVISAO: 'Revisão',
  AGENDADO: 'Agendado',
  PUBLICADO: 'Publicado',
}

const corEtapa: Record<Etapa, { borda: string; header: string; texto: string }> = {
  IDEIA:        { borda: '#5B47C8', header: '#EDE9FC', texto: '#4C3DB5' },
  PLANEJAMENTO: { borda: '#8A5A0A', header: '#FEF3E2', texto: '#8A5A0A' },
  PRODUCAO:     { borda: '#4C3DB5', header: '#EDE9FC', texto: '#4C3DB5' },
  REVISAO:      { borda: '#7C5A14', header: '#FEF3E2', texto: '#7C5A14' },
  AGENDADO:     { borda: '#1A6B42', header: '#E8F5EE', texto: '#1A6B42' },
  PUBLICADO:    { borda: '#6B6860', header: '#F3F2EF', texto: '#6B6860' },
}

const PROXIMA_ETAPA: Partial<Record<Etapa, Etapa>> = {
  IDEIA: 'PLANEJAMENTO',
  PLANEJAMENTO: 'PRODUCAO',
  PRODUCAO: 'REVISAO',
  REVISAO: 'AGENDADO',
  AGENDADO: 'PUBLICADO',
}

const estiloLabel: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '3px' }
const estiloInput: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }

export default function PaginaMarketing() {
  const { data: session } = useSession()
  const router = useRouter()

  const [cards, setCards] = useState<CardMkt[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalCriar, setModalCriar] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<CardMkt | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)

  const [form, setForm] = useState({
    titulo: '', descricao: '', plataforma: '', responsavel: '', dataPublicacao: '', observacoes: '',
  })

  const cargo = session?.user?.cargo

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/marketing')
      if (r.ok) setCards(await r.json())
    } finally { setCarregando(false) }
  }, [])

  useEffect(() => {
    if (session) carregar()
  }, [session, carregar])

  useEffect(() => {
    if (session === null) router.push('/login')
  }, [session, router])

  function cardsPorEtapa(etapa: Etapa) {
    return cards.filter(c => c.etapa === etapa)
  }

  async function criarCard(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSalvando(true)
    setMensagem('')
    try {
      const r = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo:         form.titulo.trim(),
          descricao:      form.descricao || null,
          plataforma:     form.plataforma || null,
          responsavel:    form.responsavel || null,
          dataPublicacao: form.dataPublicacao || null,
          observacoes:    form.observacoes || null,
        }),
      })
      if (r.ok) {
        const novo = await r.json()
        setCards(prev => [novo, ...prev])
        setModalCriar(false)
        setForm({ titulo: '', descricao: '', plataforma: '', responsavel: '', dataPublicacao: '', observacoes: '' })
      } else {
        const dados = await r.json()
        setMensagem('Erro: ' + (dados.erro ?? 'Erro ao criar'))
        setTimeout(() => setMensagem(''), 4000)
      }
    } finally { setSalvando(false) }
  }

  async function moverEtapa(id: string, novaEtapa: Etapa) {
    const r = await fetch(`/api/marketing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: novaEtapa }),
    })
    if (r.ok) {
      const atualizado = await r.json()
      setCards(prev => prev.map(c => c.id === id ? atualizado : c))
      if (detalheAberto?.id === id) setDetalheAberto(atualizado)
    }
  }

  async function salvarDetalhe(dados: Partial<CardMkt>) {
    if (!detalheAberto) return
    setSalvando(true)
    try {
      const r = await fetch(`/api/marketing/${detalheAberto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      if (r.ok) {
        const atualizado = await r.json()
        setCards(prev => prev.map(c => c.id === atualizado.id ? atualizado : c))
        setDetalheAberto(atualizado)
        setMensagem('Salvo')
        setTimeout(() => setMensagem(''), 2000)
      }
    } finally { setSalvando(false) }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este card de marketing?')) return
    try {
      const r = await fetch(`/api/marketing/${id}`, { method: 'DELETE' })
      if (r.ok) {
        setCards(prev => prev.filter(c => c.id !== id))
        setDetalheAberto(null)
      }
    } catch { /* ignora */ }
  }

  // Drag & Drop
  function onDragStart(id: string) {
    setDragId(id)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function onDrop(etapa: Etapa) {
    if (dragId) {
      moverEtapa(dragId, etapa)
      setDragId(null)
    }
  }

  if (!session) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Marketing
          </h1>
          <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
            Kanban de conteúdo — da ideia à publicação
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/workspace/agenda-marketing" style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', textDecoration: 'none', backgroundColor: 'transparent' }}>
            Agenda
          </Link>
          <button
            onClick={() => setModalCriar(true)}
            style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            + Novo Card
          </button>
        </div>
      </div>

      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', backgroundColor: mensagem === 'Salvo' ? 'var(--green-light)' : 'var(--red-light)', color: mensagem === 'Salvo' ? 'var(--green)' : 'var(--red)' }}>
          {mensagem}
        </div>
      )}

      {carregando ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Carregando...</p>
      ) : (
        /* Kanban */
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ETAPAS.length}, 1fr)`, gap: '12px', minHeight: '500px' }}>
          {ETAPAS.map(etapa => {
            const colCards = cardsPorEtapa(etapa)
            return (
              <div
                key={etapa}
                onDragOver={onDragOver}
                onDrop={() => onDrop(etapa)}
                style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '10px', border: `2px solid ${corEtapa[etapa].borda}22`, display: 'flex', flexDirection: 'column' }}
              >
                {/* Header coluna */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', backgroundColor: corEtapa[etapa].header, borderRadius: '8px 8px 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Inter, sans-serif', color: corEtapa[etapa].texto }}>
                      {labelEtapa[etapa]}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: corEtapa[etapa].texto, backgroundColor: `${corEtapa[etapa].borda}18`, padding: '2px 7px', borderRadius: '8px' }}>
                      {colCards.length}
                    </span>
                  </div>
                </div>
                {/* Cards */}
                <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '70vh' }}>
                  {colCards.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '12px 4px', textAlign: 'center', fontStyle: 'italic' }}>Vazio</p>
                  ) : colCards.map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => onDragStart(c.id)}
                      onClick={() => setDetalheAberto(c)}
                      style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', cursor: 'grab', transition: 'box-shadow 0.12s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
                    >
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>{c.titulo}</p>
                      {c.plataforma && (
                        <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', backgroundColor: 'var(--purple-light)', color: 'var(--purple-text)', marginRight: '4px' }}>
                          {c.plataforma}
                        </span>
                      )}
                      {c.dataPublicacao && (
                        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                          {new Date(c.dataPublicacao).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {c.responsavel && (
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}>
                          {c.responsavel}
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

      {/* Modal — Criar Card */}
      {modalCriar && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalCriar(false) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '28px' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Novo Card de Marketing
            </h2>
            <form onSubmit={criarCard}>
              <div style={{ marginBottom: '12px' }}>
                <label style={estiloLabel}>Título *</label>
                <input style={estiloInput} value={form.titulo} required onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex.: Post sobre novo produto"
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={estiloLabel}>Descrição</label>
                <textarea style={{ ...estiloInput, minHeight: '80px', resize: 'vertical' }} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes do conteúdo..."
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={estiloLabel}>Plataforma</label>
                  <input style={estiloInput} value={form.plataforma} onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))} placeholder="Instagram, TikTok..."
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label style={estiloLabel}>Responsável</label>
                  <input style={estiloInput} value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome"
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={estiloLabel}>Data de Publicação</label>
                <input style={estiloInput} type="date" value={form.dataPublicacao} onChange={e => setForm(f => ({ ...f, dataPublicacao: e.target.value }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={estiloLabel}>Observações</label>
                <textarea style={{ ...estiloInput, minHeight: '60px', resize: 'vertical' }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas extras..."
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModalCriar(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} style={{ flex: 2, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Criando...' : 'Criar Card'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal — Detalhe / Edição */}
      {detalheAberto && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setDetalheAberto(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '28px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {detalheAberto.titulo}
                </h2>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: corEtapa[detalheAberto.etapa].header, color: corEtapa[detalheAberto.etapa].texto }}>
                  {labelEtapa[detalheAberto.etapa]}
                </span>
              </div>
              <button onClick={() => setDetalheAberto(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>✕</button>
            </div>

            {/* Dados */}
            <div style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              {detalheAberto.descricao && <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{detalheAberto.descricao}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
                {detalheAberto.plataforma && <p style={{ margin: 0 }}>Plataforma: <strong>{detalheAberto.plataforma}</strong></p>}
                {detalheAberto.responsavel && <p style={{ margin: 0 }}>Responsável: <strong>{detalheAberto.responsavel}</strong></p>}
                {detalheAberto.dataPublicacao && <p style={{ margin: 0 }}>Publicação: <strong>{new Date(detalheAberto.dataPublicacao).toLocaleDateString('pt-BR')}</strong></p>}
                <p style={{ margin: 0 }}>Criado: <strong>{new Date(detalheAberto.createdAt).toLocaleDateString('pt-BR')}</strong></p>
              </div>
              {detalheAberto.observacoes && (
                <p style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                  {detalheAberto.observacoes}
                </p>
              )}
            </div>

            {/* Edição inline */}
            <DetailEdit card={detalheAberto} onSave={salvarDetalhe} salvando={salvando} />

            {/* Ações */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
              {PROXIMA_ETAPA[detalheAberto.etapa] && (
                <button
                  onClick={() => moverEtapa(detalheAberto.id, PROXIMA_ETAPA[detalheAberto.etapa]!)}
                  style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Avançar → {labelEtapa[PROXIMA_ETAPA[detalheAberto.etapa]!]}
                </button>
              )}
              {detalheAberto.etapa !== 'IDEIA' && (
                <button
                  onClick={() => {
                    const idx = ETAPAS.indexOf(detalheAberto.etapa)
                    if (idx > 0) moverEtapa(detalheAberto.id, ETAPAS[idx - 1])
                  }}
                  style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ← Voltar Etapa
                </button>
              )}
              {(cargo === 'ADMIN' || cargo === 'SOCIO') && (
                <button
                  onClick={() => excluir(detalheAberto.id)}
                  style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer', marginLeft: 'auto' }}
                >
                  Excluir
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

// Componente de edição inline para detalhe
function DetailEdit({ card, onSave, salvando }: { card: CardMkt; onSave: (d: Partial<CardMkt>) => void; salvando: boolean }) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(card.titulo)
  const [descricao, setDescricao] = useState(card.descricao ?? '')
  const [plataforma, setPlataforma] = useState(card.plataforma ?? '')
  const [responsavel, setResponsavel] = useState(card.responsavel ?? '')
  const [dataPublicacao, setDataPublicacao] = useState(card.dataPublicacao ? new Date(card.dataPublicacao).toISOString().slice(0, 10) : '')
  const [observacoes, setObservacoes] = useState(card.observacoes ?? '')

  useEffect(() => {
    setTitulo(card.titulo)
    setDescricao(card.descricao ?? '')
    setPlataforma(card.plataforma ?? '')
    setResponsavel(card.responsavel ?? '')
    setDataPublicacao(card.dataPublicacao ? new Date(card.dataPublicacao).toISOString().slice(0, 10) : '')
    setObservacoes(card.observacoes ?? '')
  }, [card])

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--purple)', cursor: 'pointer' }}
      >
        Editar dados
      </button>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={estiloLabel}>Título</label>
        <input style={estiloInput} value={titulo} onChange={e => setTitulo(e.target.value)}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={estiloLabel}>Descrição</label>
        <textarea style={{ ...estiloInput, minHeight: '60px', resize: 'vertical' }} value={descricao} onChange={e => setDescricao(e.target.value)}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={estiloLabel}>Plataforma</label>
          <input style={estiloInput} value={plataforma} onChange={e => setPlataforma(e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={estiloLabel}>Responsável</label>
          <input style={estiloInput} value={responsavel} onChange={e => setResponsavel(e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={estiloLabel}>Data de Publicação</label>
        <input style={estiloInput} type="date" value={dataPublicacao} onChange={e => setDataPublicacao(e.target.value)}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={estiloLabel}>Observações</label>
        <textarea style={{ ...estiloInput, minHeight: '50px', resize: 'vertical' }} value={observacoes} onChange={e => setObservacoes(e.target.value)}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setEditando(false)}
          style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Cancelar
        </button>
        <button
          disabled={salvando}
          onClick={() => {
            onSave({
              titulo: titulo.trim(),
              descricao: descricao || null,
              plataforma: plataforma || null,
              responsavel: responsavel || null,
              dataPublicacao: dataPublicacao || null,
              observacoes: observacoes || null,
            } as Partial<CardMkt>)
            setEditando(false)
          }}
          style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
