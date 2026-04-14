'use client'

import { useEffect, useState, useCallback } from 'react'

interface Atividade {
  id: string
  acao: string
  entidade: string
  entidadeId: string | null
  titulo: string
  descricao: string | null
  lida: boolean
  createdAt: string
  usuario: { id: string; nome: string; avatarUrl: string | null } | null
}

interface Resposta {
  atividades: Atividade[]
  total: number
  naoLidas: number
}

const acaoLabel: Record<string, string> = {
  criou: 'criou',
  atualizou: 'atualizou',
  aprovou: 'aprovou',
  reprovou: 'reprovou',
  excluiu: 'excluiu',
  moveu: 'moveu',
  cancelou: 'cancelou',
  finalizou: 'finalizou',
  enviou: 'enviou',
  comentou: 'comentou',
  anexou: 'anexou',
}

const entidadeLabel: Record<string, string> = {
  Pedido: 'pedido',
  Orcamento: 'orçamento',
  Workspace: 'solicitação',
  Cliente: 'cliente',
  Lead: 'lead',
  CardMarketing: 'card de marketing',
  Filamento: 'filamento',
}

const entidadeCor: Record<string, string> = {
  Pedido:        'var(--purple)',
  Orcamento:     '#0E7490',
  Workspace:     '#8A5A0A',
  Cliente:       '#1A6B42',
  Lead:          '#4C3DB5',
  CardMarketing: '#B83232',
  Filamento:     '#6B6860',
}

function linkEntidade(atv: Atividade): string | null {
  if (!atv.entidadeId) return null
  switch (atv.entidade) {
    case 'Pedido':        return `/workspace/pedidos`
    case 'Orcamento':     return `/workspace/orcamentos/${atv.entidadeId}`
    case 'Workspace':     return `/workspace`
    case 'Cliente':       return `/workspace/clientes/${atv.entidadeId}`
    case 'Lead':          return `/workspace/crm`
    case 'CardMarketing': return `/workspace/marketing`
    default: return null
  }
}

function iniciais(nome: string) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function tempoRelativo(data: string) {
  const d = new Date(data)
  const delta = Date.now() - d.getTime()
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h`
  const dias = Math.floor(hrs / 24)
  if (dias < 7) return `${dias}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function InboxPanel({
  aberto,
  onFechar,
  onMudarContagem,
  onAbrirEntidade,
}: {
  aberto: boolean
  onFechar: () => void
  onMudarContagem: (n: number) => void
  onAbrirEntidade: (href: string) => void
}) {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas'>('todas')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ limite: '50' })
      if (filtro === 'nao-lidas') params.set('naoLidas', 'true')
      const r = await fetch(`/api/atividades?${params}`)
      if (r.ok) {
        const d: Resposta = await r.json()
        setAtividades(d.atividades)
        setNaoLidas(d.naoLidas)
        onMudarContagem(d.naoLidas)
      }
    } finally { setCarregando(false) }
  }, [filtro, onMudarContagem])

  useEffect(() => {
    if (aberto) carregar()
  }, [aberto, carregar])

  // Fecha com ESC
  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  async function marcarTodasLidas() {
    await fetch('/api/atividades', { method: 'PATCH' })
    carregar()
  }

  function clicarEntidade(atv: Atividade) {
    const href = linkEntidade(atv)
    if (href) onAbrirEntidade(href)
  }

  return (
    <>
      <div
        className={`inbox-backdrop${aberto ? ' visivel' : ''}`}
        onClick={onFechar}
        aria-hidden="true"
      />
      <aside
        className={`inbox-panel${aberto ? ' aberto' : ''}`}
        role="dialog"
        aria-label="Inbox — atividades do sistema"
        aria-hidden={!aberto}
      >
        {/* Cabeçalho */}
        <div className="inbox-header">
          <div>
            <h2 style={{
              fontFamily: 'Nunito, sans-serif', fontSize: '18px', fontWeight: 700,
              color: 'var(--text-primary)', margin: 0,
            }}>
              Inbox
            </h2>
            <p style={{
              fontSize: '12px', color: 'var(--text-secondary)',
              fontFamily: 'Inter, sans-serif', margin: '2px 0 0',
            }}>
              {naoLidas > 0 ? `${naoLidas} não lidas` : 'Tudo em dia'}
            </p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar inbox"
            className="inbox-close-btn"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Filtros + ações */}
        <div className="inbox-filtros">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFiltro('todas')}
              className={`inbox-pill${filtro === 'todas' ? ' ativo' : ''}`}
            >Todas</button>
            <button
              onClick={() => setFiltro('nao-lidas')}
              className={`inbox-pill${filtro === 'nao-lidas' ? ' ativo' : ''}`}
            >
              Não lidas {naoLidas > 0 && <span className="inbox-pill-badge">{naoLidas}</span>}
            </button>
          </div>
          {naoLidas > 0 && (
            <button onClick={marcarTodasLidas} className="inbox-acao-link">
              Marcar lidas
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="inbox-lista">
          {carregando ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '40px 20px', fontSize: '13px' }}>
              Carregando...
            </p>
          ) : atividades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '28px', marginBottom: '10px' }}>📥</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', marginBottom: '4px' }}>
                {filtro === 'nao-lidas' ? 'Nenhuma não lida' : 'Sem atividades'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                Ações do sistema aparecem aqui
              </p>
            </div>
          ) : (
            atividades.map(atv => {
              const corAcento = entidadeCor[atv.entidade] ?? 'var(--purple)'
              const link = linkEntidade(atv)
              return (
                <div
                  key={atv.id}
                  className={`inbox-item${atv.lida ? '' : ' nao-lida'}${link ? ' clicavel' : ''}`}
                  onClick={link ? () => clicarEntidade(atv) : undefined}
                  role={link ? 'button' : undefined}
                  tabIndex={link ? 0 : undefined}
                  onKeyDown={link ? (e) => { if (e.key === 'Enter') clicarEntidade(atv) } : undefined}
                >
                  <div
                    className="inbox-avatar"
                    style={{ background: corAcento }}
                  >
                    {atv.usuario ? iniciais(atv.usuario.nome) : '?'}
                    {!atv.lida && <span className="inbox-dot" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '12px', color: 'var(--text-primary)',
                      fontFamily: 'Inter, sans-serif', lineHeight: 1.45, margin: 0,
                    }}>
                      <strong style={{ fontWeight: 600 }}>{atv.usuario?.nome ?? 'Sistema'}</strong>
                      {' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {acaoLabel[atv.acao] ?? atv.acao} {entidadeLabel[atv.entidade] ?? atv.entidade.toLowerCase()}
                      </span>
                    </p>
                    <p style={{
                      fontSize: '13px', color: 'var(--text-primary)',
                      fontFamily: 'Inter, sans-serif', margin: '2px 0 0',
                      fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {atv.titulo}
                    </p>
                  </div>
                  <span className="inbox-tempo">{tempoRelativo(atv.createdAt)}</span>
                </div>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}
