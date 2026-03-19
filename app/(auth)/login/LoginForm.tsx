'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginForm({ logoBase64, nomeEmpresa }: { logoBase64: string | null; nomeEmpresa: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const resultado = await signIn('credentials', {
        email,
        senha,
        redirect: false,
      })

      if (resultado?.error) {
        setErro('Email ou senha incorretos')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setErro('Erro ao realizar login. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 60% 0%, rgba(91,71,200,0.06) 0%, transparent 60%), var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <main className="animate-fade-up" style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '44px 40px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {logoBase64 ? (
            <img
              src={logoBase64}
              alt={`Logo ${nomeEmpresa}`}
              style={{ maxHeight: '56px', maxWidth: '180px', objectFit: 'contain', marginBottom: '8px' }}
            />
          ) : (
            <p style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              fontSize: '28px',
              color: 'var(--purple)',
              letterSpacing: '-0.5px',
              marginBottom: '4px',
            }}>
              {nomeEmpresa}
            </p>
          )}
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}>
            Sistema de Gestão
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="login-email"
              style={{
                display: 'block',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text-primary)',
                backgroundColor: '#fff',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--purple)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,71,200,0.12)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="login-senha"
              style={{
                display: 'block',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}
            >
              Senha
            </label>
            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text-primary)',
                backgroundColor: '#fff',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--purple)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,71,200,0.12)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {erro && (
            <p
              role="alert"
              style={{
                color: 'var(--red)',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                marginBottom: '16px',
                padding: '10px 12px',
                backgroundColor: 'var(--red-light)',
                borderRadius: '6px',
              }}
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            aria-busy={carregando}
            style={{
              width: '100%',
              padding: '11px',
              backgroundColor: 'var(--purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: carregando ? 'not-allowed' : 'pointer',
              transition: 'background var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast)',
              boxShadow: 'var(--shadow-purple)',
              opacity: carregando ? 0.75 : 1,
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              if (!carregando) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--purple-dark)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-purple-hover)'
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!carregando) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--purple)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-purple)'
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              }
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          marginTop: '24px',
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif',
        }}>
          Acesso restrito a membros da equipe {nomeEmpresa}
        </p>
      </main>
    </div>
  )
}
