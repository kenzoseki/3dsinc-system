'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }

    setCarregando(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      })
      const data = await res.json()
      if (res.ok) {
        setSucesso(true)
      } else {
        setErro(data.erro ?? 'Erro ao redefinir senha.')
      }
    } catch {
      setErro('Erro de comunicação. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const estiloInput: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
    color: 'var(--text-primary)', backgroundColor: '#fff', outline: 'none',
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red)', fontFamily: 'Inter, sans-serif', fontSize: '14px', marginBottom: '16px' }}>
            Link inválido. Solicite um novo link de redefinição.
          </p>
          <button onClick={() => router.push('/login')} style={{ color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
            ← Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <main style={{
        width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)', borderRadius: '16px', padding: '44px 40px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--purple)', marginBottom: '4px' }}>
            Redefinir Senha
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Digite sua nova senha
          </p>
        </div>

        {sucesso ? (
          <div>
            <p style={{ color: 'var(--green)', fontSize: '14px', fontFamily: 'Inter, sans-serif', textAlign: 'center', marginBottom: '20px', padding: '12px', backgroundColor: 'var(--green-light)', borderRadius: '8px' }}>
              Senha redefinida com sucesso!
            </p>
            <button onClick={() => router.push('/login')} style={{
              width: '100%', padding: '11px', backgroundColor: 'var(--purple)', color: '#fff',
              border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 700,
              fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
            }}>
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Nova senha
              </label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                required minLength={6} placeholder="Mínimo 6 caracteres" style={estiloInput}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Confirmar senha
              </label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                required placeholder="Repita a nova senha" style={estiloInput}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
            </div>

            {erro && (
              <p style={{ color: 'var(--red)', fontSize: '13px', fontFamily: 'Inter, sans-serif', marginBottom: '16px', padding: '10px 12px', backgroundColor: 'var(--red-light)', borderRadius: '6px' }}>
                {erro}
              </p>
            )}

            <button type="submit" disabled={carregando} style={{
              width: '100%', padding: '11px', backgroundColor: 'var(--purple)', color: '#fff',
              border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 700,
              fontFamily: 'Nunito, sans-serif', cursor: carregando ? 'not-allowed' : 'pointer',
              opacity: carregando ? 0.75 : 1,
            }}>
              {carregando ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '20px' }}>
          <button onClick={() => router.push('/login')} style={{ color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
            ← Voltar ao login
          </button>
        </p>
      </main>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
