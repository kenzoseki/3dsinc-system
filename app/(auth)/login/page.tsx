'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
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
      backgroundColor: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 700,
            fontSize: '28px',
            color: 'var(--purple)',
            letterSpacing: '-0.5px',
            marginBottom: '4px',
          }}>
            3D Sinc
          </h1>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}>
            Sistema de Gestão
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
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
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {erro && (
            <p style={{
              color: 'var(--red)',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '16px',
              padding: '10px 12px',
              backgroundColor: 'var(--red-light)',
              borderRadius: '6px',
            }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: carregando ? 'var(--purple-dark)' : 'var(--purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'Nunito, sans-serif',
              cursor: carregando ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => { if (!carregando) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--purple-dark)' }}
            onMouseLeave={(e) => { if (!carregando) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--purple)' }}
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
          Acesso restrito a membros da equipe 3D Sinc
        </p>
      </div>
    </div>
  )
}
