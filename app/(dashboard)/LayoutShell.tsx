'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Permissoes } from '@/lib/permissoes'
import { BotaoSugestao } from '@/components/dashboard/BotaoSugestao'
import type { Cargo } from '@prisma/client'
import type { Session } from 'next-auth'

type ItemNav = {
  href: string
  label: string
  icone: string
  verificar?: (cargo: Cargo) => boolean
}

type GrupoNav = {
  titulo: string
  itens: ItemNav[]
}

const soAdmin = (c: Cargo) => c === 'ADMIN'

const gruposNavegacao: GrupoNav[] = [
  {
    titulo: 'Principal',
    itens: [
      { href: '/dashboard', label: 'Dashboard', icone: '1' },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      { href: '/dashboard/pedidos', label: 'Pedidos', icone: '2' },
      { href: '/dashboard/orcamentos', label: 'Orçamentos', icone: '3' },
      { href: '/dashboard/clientes', label: 'Clientes', icone: '4' },
      { href: '/dashboard/crm', label: 'CRM', icone: '5', verificar: soAdmin },
    ],
  },
  {
    titulo: 'Operacional',
    itens: [
      { href: '/dashboard/workspace', label: 'Workspace', icone: '6', verificar: soAdmin },
      { href: '/dashboard/producao', label: 'Produção', icone: '7', verificar: soAdmin },
      { href: '/dashboard/estoque', label: 'Estoque', icone: '8', verificar: soAdmin },
    ],
  },
  {
    titulo: 'Ferramentas',
    itens: [
      { href: '/dashboard/assistente', label: 'Assistente IA', icone: '9', verificar: soAdmin },
      { href: '/dashboard/relatorios', label: 'Relatórios', icone: '10' },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { href: '/dashboard/equipe', label: 'Equipe', icone: '11' },
      { href: '/dashboard/configuracoes', label: 'Configurações', icone: '12' },
      { href: '/dashboard/sugestoes', label: 'Sugestões', icone: '13' },
    ],
  },
]

const labelCargo: Record<string, string> = {
  ADMIN: 'Administrador',
  SOCIO: 'Sócio',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

function ItemNavLink({ href, icone, label, ativo, onClick }: {
  href: string
  icone: string
  label: string
  ativo: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 12px',
        borderRadius: '8px',
        marginBottom: '1px',
        textDecoration: 'none',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        fontWeight: ativo ? 500 : 400,
        color: ativo ? 'var(--purple-text)' : 'var(--text-secondary)',
        backgroundColor: ativo ? 'var(--purple-light)' : 'transparent',
        borderLeft: ativo ? '3px solid var(--purple)' : '3px solid transparent',
        transition: 'background-color var(--t-fast), color var(--t-fast), border-color var(--t-fast)',
        boxShadow: ativo ? 'inset 0 0 0 1px rgba(91,71,200,0.10)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!ativo) {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-hover)'
          ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!ativo) {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'
          ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
        }
      }}
    >
      <span style={{
        fontSize: '10px', lineHeight: 1, flexShrink: 0,
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
        width: '20px', height: '20px', borderRadius: '6px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: ativo ? 'var(--purple)' : 'var(--bg-hover)',
        color: ativo ? '#fff' : 'var(--text-secondary)',
        transition: 'background var(--t-fast), color var(--t-fast)',
      }}>{icone}</span>
      <span style={{ letterSpacing: '0.01em' }}>{label}</span>
    </Link>
  )
}

function LabelGrupo({ titulo }: { titulo: string }) {
  return (
    <p style={{
      fontSize: '10px',
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      padding: '12px 12px 4px',
      marginBottom: '0',
    }}>
      {titulo}
    </p>
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
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [sidebarAberta, setSidebarAberta] = useState(false)

  // Fecha sidebar ao navegar (mobile)
  useEffect(() => {
    setSidebarAberta(false)
  }, [pathname])

  const { user } = session
  const cargo = user.cargo as Cargo
  const iniciais = user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  function isAtivo(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Item fixo: Perfil (sempre visível, fora dos grupos)
  const itemPerfil = { href: '/dashboard/perfil', label: 'Perfil', icone: '👤' }

  // Filtra grupos e itens por permissão do cargo
  const gruposVisiveis = gruposNavegacao
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => !item.verificar || item.verificar(cargo)),
    }))
    .filter((grupo) => grupo.itens.length > 0)

  const conteudoSidebar = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {logoEmpresa ? (
            <img src={logoEmpresa} alt="Logo 3D Sinc" style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--purple)', letterSpacing: '-0.3px' }}>
              3D Sinc
            </h1>
          )}
        </Link>
        <button
          className="topbar-hamburguer"
          onClick={() => setSidebarAberta(false)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '20px', padding: '4px',
            lineHeight: 1,
          }}
          aria-label="Fechar menu"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {/* Navegação categorizada */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
        {gruposVisiveis.map((grupo) => (
          <div key={grupo.titulo}>
            <LabelGrupo titulo={grupo.titulo} />
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
        ))}

        {/* Perfil — sempre visível, separado */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
          <ItemNavLink
            href={itemPerfil.href}
            icone={itemPerfil.icone}
            label={itemPerfil.label}
            ativo={isAtivo(itemPerfil.href)}
            onClick={() => setSidebarAberta(false)}
          />
        </div>
      </nav>

      {/* Info do usuário */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: 'var(--purple)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', flexShrink: 0,
          }}>{iniciais}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.nome}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
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
      <aside
        className={`layout-sidebar${sidebarAberta ? ' aberta' : ''}`}
        style={{
          width: '224px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          backgroundImage: 'linear-gradient(180deg, var(--bg-surface) 0%, #F7F5F1 100%)',
        }}
      >
        {conteudoSidebar}
      </aside>

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '54px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(44,42,38,0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <button
            className="topbar-hamburguer"
            onClick={() => setSidebarAberta(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '18px',
              lineHeight: 1,
              display: 'none',
            }}
            aria-label="Abrir menu"
          >
            <span aria-hidden="true">☰</span>
          </button>

          {/* Avatar + dropdown */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              aria-label={`Menu do usuário: ${user.nome}`}
              aria-expanded={dropdownAberto}
              aria-haspopup="menu"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '6px 10px', borderRadius: '8px',
                border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                transition: 'background-color 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--purple), var(--purple-dark))',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                boxShadow: '0 1px 4px rgba(91,71,200,0.25)',
                flexShrink: 0,
              }}>{iniciais}</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{user.nome}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{labelCargo[user.cargo] ?? user.cargo}</p>
              </div>
              <span aria-hidden="true" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>▾</span>
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
                    href="/dashboard/perfil"
                    onClick={() => setDropdownAberto(false)}
                    style={{
                      display: 'block', padding: '8px 12px', borderRadius: '6px',
                      fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                      textDecoration: 'none', transition: 'background-color 0.12s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'}
                  >Meu Perfil</Link>
                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setDropdownAberto(false); signOut({ callbackUrl: '/login' }) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', borderRadius: '6px',
                      fontSize: '13px', color: 'var(--red)', fontFamily: 'Inter, sans-serif',
                      border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                      transition: 'background-color 0.12s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--red-light)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                  >Sair</button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Conteúdo */}
        <main className="layout-main" style={{ flex: 1, padding: '28px 48px', overflow: 'auto' }}>
          {children}
        </main>
      </div>

      {/* FAB — Sugestão / Bug */}
      {cargo !== 'VISUALIZADOR' && <BotaoSugestao />}
    </div>
  )
}
