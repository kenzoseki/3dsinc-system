'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface DadosConvite {
  email: string
  cargo: string
}

const estiloInput: React.CSSProperties = {
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
}

const estiloLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: '6px',
}

function FormularioPrimeiroAcesso() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [dadosConvite, setDadosConvite] = useState<DadosConvite | null>(null)
  const [erroToken, setErroToken] = useState('')
  const [carregandoToken, setCarregandoToken] = useState(true)

  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!token) {
      setErroToken('Token de convite não informado')
      setCarregandoToken(false)
      return
    }

    async function validarToken() {
      try {
        const resposta = await fetch(`/api/convite/validar?token=${token}`)
        const dados = await resposta.json()

        if (!resposta.ok) {
          setErroToken(dados.erro ?? 'Convite inválido')
        } else {
          setDadosConvite(dados)
        }
      } catch {
        setErroToken('Erro ao validar convite')
      } finally {
        setCarregandoToken(false)
      }
    }

    validarToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setCarregando(true)

    try {
      const resposta = await fetch('/api/convite/aceitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nome, senha }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(dados.erro ?? 'Erro ao criar conta')
      } else {
        router.push('/login')
      }
    } catch {
      setErro('Erro ao criar conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  if (carregandoToken) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
        Validando convite...
      </div>
    )
  }

  if (erroToken) {
    return (
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: 'var(--red-light)',
        color: 'var(--red)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Convite inválido</p>
        <p style={{ fontSize: '13px' }}>{erroToken}</p>
      </div>
    )
  }

  return (
    <>
      {dadosConvite && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: 'var(--purple-light)',
          border: '1px solid var(--border)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--text-primary)' }}>Convite para: </span>
          <span style={{ color: 'var(--purple-text)', fontWeight: 500 }}>{dadosConvite.email}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>Cargo: </span>
          <span style={{ color: 'var(--purple-text)', fontWeight: 500 }}>{dadosConvite.cargo}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="pa-nome" style={estiloLabel}>Seu Nome</label>
          <input
            id="pa-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoComplete="name"
            placeholder="Nome completo"
            style={estiloInput}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="pa-senha" style={estiloLabel}>Criar Senha</label>
          <input
            id="pa-senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            style={estiloInput}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="pa-confirmar-senha" style={estiloLabel}>Confirmar Senha</label>
          <input
            id="pa-confirmar-senha"
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repita a senha"
            style={estiloInput}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {erro && (
          <p role="alert" style={{
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
          aria-busy={carregando}
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
          {carregando ? 'Criando conta...' : 'Criar Minha Conta'}
        </button>
      </form>
    </>
  )
}

export default function PaginaPrimeiroAcesso() {
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
            Configure seu acesso
          </p>
        </div>

        <Suspense
          fallback={
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
              Carregando...
            </div>
          }
        >
          <FormularioPrimeiroAcesso />
        </Suspense>
      </div>
    </div>
  )
}
