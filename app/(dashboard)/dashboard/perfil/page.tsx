'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

const labelCargo: Record<string, string> = {
  ADMIN: 'Administrador', SOCIO: 'Sócio', GERENTE: 'Gerente',
  OPERADOR: 'Operador', VISUALIZADOR: 'Visualizador',
}

const estiloInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)', backgroundColor: '#fff', outline: 'none',
  boxSizing: 'border-box',
}

const estiloLabel: React.CSSProperties = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '13px',
  fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px',
}

const estiloCartao: React.CSSProperties = {
  padding: '28px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginBottom: '16px',
}

export default function PaginaPerfil() {
  const { data: session, update } = useSession()
  const usuario = session?.user

  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [telefone, setTelefone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(usuario?.avatarUrl ?? '')
  const [salvando, setSalvando] = useState(false)
  const [mensagemPerfil, setMensagemPerfil] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [mensagemSenha, setMensagemSenha] = useState('')

  if (!usuario) return null

  const iniciais = usuario.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMensagemPerfil('')
    try {
      const resposta = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone: telefone || null, avatarUrl: avatarUrl || null }),
      })
      const dados = await resposta.json()
      if (resposta.ok) {
        await update({ nome: dados.nome, avatarUrl: dados.avatarUrl })
        setMensagemPerfil('✓ Perfil atualizado com sucesso')
      } else {
        setMensagemPerfil('✗ ' + (dados.erro ?? 'Erro ao salvar'))
      }
    } catch {
      setMensagemPerfil('✗ Erro de comunicação')
    } finally {
      setSalvando(false)
    }
  }

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setMensagemSenha('')
    if (novaSenha !== confirmaSenha) {
      setMensagemSenha('✗ As senhas não coincidem')
      return
    }
    setSalvandoSenha(true)
    try {
      const resposta = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'alterarSenha', senhaAtual, novaSenha }),
      })
      const dados = await resposta.json()
      if (resposta.ok) {
        setMensagemSenha('✓ Senha alterada com sucesso')
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmaSenha('')
      } else {
        setMensagemSenha('✗ ' + (dados.erro ?? 'Erro ao alterar senha'))
      }
    } catch {
      setMensagemSenha('✗ Erro de comunicação')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const corMensagem = (msg: string) => msg.startsWith('✓') ? 'var(--green)' : 'var(--red)'

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Meu Perfil
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Gerencie suas informações pessoais
        </p>
      </div>

      {/* Card de identidade */}
      <div style={estiloCartao}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {usuario.avatarUrl ? (
            <img src={usuario.avatarUrl} alt={usuario.nome} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: 'var(--purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', flexShrink: 0 }}>
              {iniciais}
            </div>
          )}
          <div>
            <p style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-primary)' }}>{usuario.nome}</p>
            <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px', marginTop: '2px' }}>{usuario.email}</p>
            <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--purple-light)', color: 'var(--purple-text)' }}>
              {labelCargo[usuario.cargo] ?? usuario.cargo}
            </span>
          </div>
        </div>
      </div>

      {/* Formulário de dados */}
      <div style={estiloCartao}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '20px' }}>
          Dados Pessoais
        </h2>
        <form onSubmit={salvarPerfil}>
          <div style={{ marginBottom: '16px' }}>
            <label style={estiloLabel}>Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={estiloLabel}>Email <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(somente leitura)</span></label>
            <input value={usuario.email} readOnly style={{ ...estiloInput, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={estiloLabel}>Telefone</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={estiloLabel}>URL do Avatar</label>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          {mensagemPerfil && (
            <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: corMensagem(mensagemPerfil), marginBottom: '12px' }}>
              {mensagemPerfil}
            </p>
          )}
          <button type="submit" disabled={salvando} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      {/* Formulário de senha */}
      <div style={estiloCartao}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '20px' }}>
          Alterar Senha
        </h2>
        <form onSubmit={alterarSenha}>
          <div style={{ marginBottom: '16px' }}>
            <label style={estiloLabel}>Senha Atual *</label>
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={estiloLabel}>Nova Senha *</label>
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label style={estiloLabel}>Confirmar Senha *</label>
              <input type="password" value={confirmaSenha} onChange={(e) => setConfirmaSenha(e.target.value)} style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
            </div>
          </div>
          {mensagemSenha && (
            <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: corMensagem(mensagemSenha), marginBottom: '12px' }}>
              {mensagemSenha}
            </p>
          )}
          <button type="submit" disabled={salvandoSenha} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvandoSenha ? 'not-allowed' : 'pointer', opacity: salvandoSenha ? 0.7 : 1 }}>
            {salvandoSenha ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
