'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'

const itensNavegacao = [
  { href: '/dashboard', label: 'Dashboard', icone: '⊞' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icone: '📋' },
  { href: '/dashboard/orcamentos', label: 'Orçamentos', icone: '📄' },
  { href: '/dashboard/clientes', label: 'Clientes', icone: '👥' },
  { href: '/dashboard/producao', label: 'Produção', icone: '⚙️' },
  { href: '/dashboard/estoque', label: 'Estoque', icone: '🧵' },
  { href: '/dashboard/relatorios', label: 'Relatórios', icone: '📊' },
  { href: '/dashboard/assistente', label: 'Assistente IA', icone: '✦' },
  { href: '/dashboard/perfil', label: 'Perfil', icone: '👤' },
]

const itemEquipe = { href: '/dashboard/equipe', label: 'Equipe', icone: '👥' }
const itemConfig = { href: '/dashboard/configuracoes', label: 'Configurações', icone: '⚙' }

const labelCargo: Record<string, string> = {
  ADMIN: 'Administrador',
  SOCIO: 'Sócio',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

function ItemNav({ href, icone, label, ativo, onClick }: {
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
        padding: '8px 12px',
        borderRadius: '7px',
        marginBottom: '2px',
        textDecoration: 'none',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13.5px',
        fontWeight: ativo ? 500 : 400,
        color: ativo ? 'var(--purple-text)' : 'var(--text-secondary)',
        backgroundColor: ativo ? 'var(--purple-light)' : 'transparent',
        borderLeft: ativo ? '3px solid var(--purple)' : '3px solid transparent',
        transition: 'all 0.12s',
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
      <span style={{ fontSize: '14px' }}>{icone}</span>
      <span>{label}</span>
    </Link>
  )
}

export default function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then(c => setLogoEmpresa(c.logoBase64 ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Fecha sidebar ao navegar (mobile)
  useEffect(() => {
    setSidebarAberta(false)
  }, [pathname])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', fontSize: '14px' }}>Carregando...</p>
      </div>
    )
  }

  if (!session?.user) return null

  const { user } = session
  const cargo = user.cargo as Cargo
  const podeVerEquipe = Permissoes.podeVerEquipe(cargo)
  const isAdmin = cargo === 'ADMIN'
  const iniciais = user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  function isAtivo(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const conteudoSidebar = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {logoEmpresa ? (
            <img src={logoEmpresa} alt="Logo" style={{ maxHeight: '36px', maxWidth: '140px', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--purple)', letterSpacing: '-0.3px' }}>
              3D Sinc
            </h1>
          )}
        </Link>
        {/* Botão fechar sidebar — apenas mobile */}
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
          ✕
        </button>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {itensNavegacao.map((item) => (
          <ItemNav
            key={item.href}
            href={item.href}
            icone={item.icone}
            label={item.label}
            ativo={isAtivo(item.href)}
            onClick={() => setSidebarAberta(false)}
          />
        ))}

        {podeVerEquipe && (
          <ItemNav
            href={itemEquipe.href}
            icone={itemEquipe.icone}
            label={itemEquipe.label}
            ativo={pathname.startsWith(itemEquipe.href)}
            onClick={() => setSidebarAberta(false)}
          />
        )}

        {isAdmin && (
          <ItemNav
            href={itemConfig.href}
            icone={itemConfig.icone}
            label={itemConfig.label}
            ativo={pathname.startsWith(itemConfig.href)}
            onClick={() => setSidebarAberta(false)}
          />
        )}
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

      {/* Overlay mobile (clique fora fecha sidebar) */}
      <div
        className={`sidebar-overlay${sidebarAberta ? ' visivel' : ''}`}
        onClick={() => setSidebarAberta(false)}
      />

      {/* Sidebar */}
      <aside
        className={`layout-sidebar${sidebarAberta ? ' aberta' : ''}`}
        style={{
          width: '220px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
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
          height: '56px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Botão hambúrguer — visível apenas em mobile via CSS */}
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
              display: 'none', // controlado por CSS via classe
            }}
            aria-label="Abrir menu"
          >
            ☰
          </button>

          {/* Avatar + dropdown */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
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
                backgroundColor: 'var(--purple)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, fontFamily: 'Nunito, sans-serif',
              }}>{iniciais}</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{user.nome}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{labelCargo[user.cargo] ?? user.cargo}</p>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>▾</span>
            </button>

            {dropdownAberto && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setDropdownAberto(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: '6px',
                  width: '180px', borderRadius: '8px', padding: '4px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  zIndex: 20,
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
        <main className="layout-main" style={{ flex: 1, padding: '32px 64px', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
