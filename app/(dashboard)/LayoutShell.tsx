'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { signOut } from 'next-auth/react'
import { BotaoSugestao } from '@/components/dashboard/BotaoSugestao'
import { InboxPanel } from '@/components/dashboard/InboxPanel'
import type { Cargo } from '@prisma/client'
import type { Session } from 'next-auth'

type ItemNav = {
  href: string
  label: string
  icone: string
  verificar?: (cargo: Cargo) => boolean
}

type GrupoNav = {
  titulo: string | null
  itens: ItemNav[]
  colapsavel?: boolean
}

const soAdmin = (c: Cargo) => c === 'ADMIN'

const gruposNavegacao: GrupoNav[] = [
  {
    titulo: null, // Principal — oculto mas considerado grupo raiz
    itens: [
      { href: '/home', label: 'Início', icone: '1' },
      { href: '/workspace', label: 'Workspace', icone: '2' },
      { href: '/workspace/relatorios', label: 'Relatórios', icone: '3' },
    ],
  },
  {
    titulo: 'Comercial',
    colapsavel: true,
    itens: [
      { href: '/workspace/pedidos', label: 'Pedidos', icone: '4' },
      { href: '/workspace/orcamentos', label: 'Orçamentos', icone: '5' },
    ],
  },
  {
    titulo: 'Produção',
    colapsavel: true,
    itens: [
      { href: '/workspace/producao', label: 'Produção', icone: '6' },
      { href: '/workspace/agenda-producao', label: 'Agenda', icone: '7' },
    ],
  },
  {
    titulo: 'Marketing',
    colapsavel: true,
    itens: [
      { href: '/workspace/marketing', label: 'Kanban', icone: '8' },
      { href: '/workspace/agenda-marketing', label: 'Agenda', icone: '9' },
    ],
  },
  {
    titulo: 'Financeiro',
    colapsavel: true,
    itens: [
      { href: '/workspace/financeiro/pagamentos', label: 'Pagamentos', icone: '10' },
      { href: '/workspace/financeiro/compras', label: 'Compras', icone: '11' },
      { href: '/workspace/financeiro/nfe', label: 'NF-e', icone: '12' },
    ],
  },
  {
    titulo: 'CRM',
    colapsavel: true,
    itens: [
      { href: '/workspace/clientes', label: 'Clientes', icone: '13' },
      { href: '/workspace/crm', label: 'Funil', icone: '14', verificar: soAdmin },
    ],
  },
  {
    titulo: 'Ferramentas',
    colapsavel: true,
    itens: [
      { href: '/workspace/assistente', label: 'Assistente IA', icone: '15', verificar: soAdmin },
    ],
  },
]

// Itens fixos no rodapé (Perfil, Equipe, Feedback, Configurações)
const itensRodape: ItemNav[] = [
  { href: '/workspace/perfil', label: 'Perfil', icone: 'P' },
  { href: '/workspace/equipe', label: 'Equipe', icone: 'E' },
  { href: '/workspace/sugestoes', label: 'Feedback', icone: 'F' },
  { href: '/workspace/configuracoes', label: 'Configurações', icone: 'C' },
]

const labelCargo: Record<string, string> = {
  ADMIN: 'Administrador',
  SOCIO: 'Sócio',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

function ItemNavLink({ href, icone, label, ativo, onClick, compact }: {
  href: string
  icone: string
  label: string
  ativo: boolean
  onClick?: () => void
  compact?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      prefetch={false}
      className={`nav-item${ativo ? ' nav-item-ativo' : ''}${compact ? ' nav-item-compact' : ''}`}
    >
      <span className="nav-item-icone">{icone}</span>
      <span style={{ letterSpacing: '0.01em' }}>{label}</span>
    </Link>
  )
}

function CabecalhoGrupo({ titulo, aberto, onToggle }: {
  titulo: string
  aberto: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={aberto}
      className="nav-grupo-toggle"
    >
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {titulo}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: '10px',
          color: 'var(--text-secondary)',
          transform: `rotate(${aberto ? 90 : 0}deg)`,
          transition: 'transform 0.15s ease',
          lineHeight: 1,
        }}
      >▶</span>
    </button>
  )
}

export default function LayoutShell({
  children,
  session,
  logoEmpresa,
}: {
  children: React.ReactNode
  session: Session
  logoEmpresa: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [inboxAberto, setInboxAberto] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)

  // Estado de colapso dos grupos — persistido em localStorage
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('sidebar-grupos-abertos')
      if (salvo) {
        setGruposAbertos(JSON.parse(salvo))
      } else {
        // Default: todos abertos
        const tudo: Record<string, boolean> = {}
        gruposNavegacao.forEach(g => { if (g.titulo) tudo[g.titulo] = true })
        setGruposAbertos(tudo)
      }
    } catch {}
  }, [])

  useEffect(() => {
    setSidebarAberta(false)
    setInboxAberto(false)
  }, [pathname])

  // Carrega contagem de não lidas (refresh ao abrir inbox)
  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      try {
        const r = await fetch('/api/atividades?naoLidas=true&limite=1')
        if (!cancelado && r.ok) {
          const d = await r.json()
          setNaoLidas(d.naoLidas ?? 0)
        }
      } catch {}
    }
    carregar()
    const intervalo = setInterval(carregar, 60000) // refresh 60s
    return () => { cancelado = true; clearInterval(intervalo) }
  }, [pathname])

  function toggleGrupo(titulo: string) {
    setGruposAbertos(prev => {
      const novo = { ...prev, [titulo]: !prev[titulo] }
      try { localStorage.setItem('sidebar-grupos-abertos', JSON.stringify(novo)) } catch {}
      return novo
    })
  }

  const { user } = session
  const cargo = user.cargo as Cargo
  const iniciais = user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  function isAtivo(href: string) {
    if (href === '/home') return pathname === '/home'
    if (href === '/workspace') return pathname === '/workspace'
    return pathname.startsWith(href)
  }

  // Filtra grupos e itens por permissão do cargo
  const gruposVisiveis = useMemo(() =>
    gruposNavegacao
      .map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter((item) => !item.verificar || item.verificar(cargo)),
      }))
      .filter((grupo) => grupo.itens.length > 0)
  , [cargo])

  const rodapeVisivel = useMemo(() =>
    itensRodape.filter(i => !i.verificar || i.verificar(cargo))
  , [cargo])

  const conteudoSidebar = (
    <>
      {/* Logo — mesma altura do header */}
      <div className="sidebar-logo">
        <Link href="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {logoEmpresa ? (
            <img src={logoEmpresa} alt="Logo 3D Sinc" style={{ maxHeight: '32px', maxWidth: '140px', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--purple)', letterSpacing: '-0.3px', margin: 0 }}>
              3D Sinc
            </h1>
          )}
        </Link>
        <button
          className="topbar-hamburguer sidebar-fechar"
          onClick={() => setSidebarAberta(false)}
          aria-label="Fechar menu"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {/* Navegação com dropdowns */}
      <nav className="sidebar-nav">
        {gruposVisiveis.map((grupo, idx) => {
          if (!grupo.titulo) {
            // Grupo sem título (Principal) — sempre visível
            return (
              <div key={`raiz-${idx}`} className="nav-grupo">
                {grupo.itens.map((item) => (
                  <ItemNavLink
                    key={item.href}
                    href={item.href}
                    icone={item.icone}
                    label={item.label}
                    ativo={isAtivo(item.href)}
                    onClick={() => setSidebarAberta(false)}
                  />
                ))}
              </div>
            )
          }
          const aberto = gruposAbertos[grupo.titulo] ?? true
          return (
            <div key={grupo.titulo} className="nav-grupo">
              <CabecalhoGrupo
                titulo={grupo.titulo}
                aberto={aberto}
                onToggle={() => toggleGrupo(grupo.titulo!)}
              />
              {aberto && (
                <div className="nav-grupo-conteudo">
                  {grupo.itens.map((item) => (
                    <ItemNavLink
                      key={item.href}
                      href={item.href}
                      icone={item.icone}
                      label={item.label}
                      ativo={isAtivo(item.href)}
                      onClick={() => setSidebarAberta(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Rodapé: Perfil, Equipe, Feedback, Configurações */}
      <div className="sidebar-rodape">
        {rodapeVisivel.map(item => (
          <ItemNavLink
            key={item.href}
            href={item.href}
            icone={item.icone}
            label={item.label}
            ativo={isAtivo(item.href)}
            onClick={() => setSidebarAberta(false)}
            compact
          />
        ))}
        {/* Info do usuário */}
        <div className="sidebar-userinfo">
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            backgroundColor: 'var(--purple)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', flexShrink: 0,
          }}>{iniciais}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
              {user.nome}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              {labelCargo[user.cargo] ?? user.cargo}
            </p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-page)' }}>

      {/* Overlay mobile */}
      <div
        className={`sidebar-overlay${sidebarAberta ? ' visivel' : ''}`}
        onClick={() => setSidebarAberta(false)}
      />

      {/* Sidebar */}
      <aside className={`layout-sidebar${sidebarAberta ? ' aberta' : ''}`}>
        {conteudoSidebar}
      </aside>

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar — roxo */}
        <header className="layout-header">
          <button
            className="topbar-hamburguer"
            onClick={() => setSidebarAberta(true)}
            aria-label="Abrir menu"
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            {/* Sino de Inbox */}
            <button
              onClick={() => setInboxAberto(true)}
              aria-label={`Inbox${naoLidas > 0 ? ` — ${naoLidas} não lidas` : ''}`}
              className="header-icon-btn"
            >
              <span aria-hidden="true" style={{ fontSize: '16px' }}>🔔</span>
              {naoLidas > 0 && (
                <span className="header-badge" aria-hidden="true">
                  {naoLidas > 99 ? '99+' : naoLidas}
                </span>
              )}
            </button>

            {/* Avatar + dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownAberto(!dropdownAberto)}
                aria-label={`Menu do usuário: ${user.nome}`}
                aria-expanded={dropdownAberto}
                aria-haspopup="menu"
                className="header-user-btn"
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.25)',
                }}>{iniciais}</div>
                <div className="topbar-user-info" style={{ textAlign: 'left', color: '#fff' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'Inter, sans-serif', margin: 0 }}>{user.nome}</p>
                  <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', margin: 0, opacity: 0.85 }}>{labelCargo[user.cargo] ?? user.cargo}</p>
                </div>
                <span className="topbar-user-info" aria-hidden="true" style={{ color: '#fff', fontSize: '12px', opacity: 0.9 }}>▾</span>
              </button>

              {dropdownAberto && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setDropdownAberto(false)} />
                  <div
                    role="menu"
                    aria-label="Opções do usuário"
                    className="animate-scale-in"
                    style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '6px',
                    width: '188px', borderRadius: '10px', padding: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 20,
                    transformOrigin: 'top right',
                  }}>
                    <Link
                      href="/workspace/perfil"
                      onClick={() => setDropdownAberto(false)}
                      style={{
                        display: 'block', padding: '8px 12px', borderRadius: '6px',
                        fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                        textDecoration: 'none',
                      }}
                    >Meu Perfil</Link>
                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                    <button
                      onClick={() => { setDropdownAberto(false); signOut({ callbackUrl: '/login' }) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', borderRadius: '6px',
                        fontSize: '13px', color: 'var(--red)', fontFamily: 'Inter, sans-serif',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                      }}
                    >Sair</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="layout-main" style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>

      {/* Inbox Panel (slide-over desktop, modal mobile) */}
      <InboxPanel
        aberto={inboxAberto}
        onFechar={() => setInboxAberto(false)}
        onMudarContagem={setNaoLidas}
        onAbrirEntidade={(href) => { setInboxAberto(false); router.push(href) }}
      />

      {/* FAB — Sugestão / Bug */}
      {cargo !== 'VISUALIZADOR' && <BotaoSugestao />}
    </div>
  )
}
