'use client'

import { useSession } from 'next-auth/react'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface Membro {
  id: string
  nome: string
  email: string
  cargo: Cargo
  ativo: boolean
  avatarUrl: string | null
  createdAt: string
}

const labelCargo: Record<string, string> = {
  ADMIN: 'Admin', SOCIO: 'Sócio', GERENTE: 'Gerente',
  OPERADOR: 'Operador', VISUALIZADOR: 'Visualizador',
}

const estiloInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box',
}

const estiloLabel: React.CSSProperties = {
  display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '13px',
  fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px',
}

export default function PaginaEquipe() {
  const { data: session } = useSession()
  const router = useRouter()
  const cargo = session?.user?.cargo as Cargo | undefined

  const [membros, setMembros] = useState<Membro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')

  // Modal de convite
  const [modalConvite, setModalConvite] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [cargoConvite, setCargoConvite] = useState<'SOCIO' | 'GERENTE' | 'OPERADOR' | 'VISUALIZADOR'>('OPERADOR')
  const [enviandoConvite, setEnviandoConvite] = useState(false)
  const [linkGerado, setLinkGerado] = useState('')

  const isAdmin = cargo === 'ADMIN'
  const isSocio = cargo === 'SOCIO'
  const podeConvidar = isAdmin || isSocio
  const podeGerenciar = isAdmin
  const podeExcluir = isAdmin || isSocio

  const buscarMembros = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/equipe')
      if (r.ok) setMembros(await r.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (cargo && !Permissoes.podeVerEquipe(cargo)) router.push('/home')
  }, [cargo, router])

  useEffect(() => {
    if (cargo && Permissoes.podeVerEquipe(cargo)) buscarMembros()
  }, [cargo, buscarMembros])

  async function alterarCargo(id: string, novoCargo: string) {
    const r = await fetch(`/api/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cargo: novoCargo }),
    })
    if (r.ok) {
      setMembros(prev => prev.map(m => m.id === id ? { ...m, cargo: novoCargo as Cargo } : m))
      setMensagem('✓ Cargo atualizado')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  async function alterarStatus(id: string, ativo: boolean) {
    const r = await fetch(`/api/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo }),
    })
    if (r.ok) {
      setMembros(prev => prev.map(m => m.id === id ? { ...m, ativo } : m))
      setMensagem(ativo ? '✓ Membro ativado' : '✓ Membro desativado')
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  async function excluirMembro(id: string, nome: string) {
    if (!confirm(`Excluir ${nome} permanentemente? Esta ação não pode ser desfeita.`)) return
    const r = await fetch(`/api/equipe/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setMembros(prev => prev.filter(m => m.id !== id))
      setMensagem('✓ Membro excluído')
      setTimeout(() => setMensagem(''), 3000)
    } else {
      const dados = await r.json()
      setMensagem('✗ ' + (dados.erro ?? 'Erro ao excluir'))
      setTimeout(() => setMensagem(''), 4000)
    }
  }

  function podeExcluirMembro(membro: Membro): boolean {
    if (membro.id === session?.user?.id) return false
    if (membro.cargo === 'ADMIN') return false
    if (isAdmin) return true
    if (isSocio && ['GERENTE', 'OPERADOR', 'VISUALIZADOR'].includes(membro.cargo)) return true
    return false
  }

  async function gerarConvite(e: React.FormEvent) {
    e.preventDefault()
    setEnviandoConvite(true)
    setLinkGerado('')
    try {
      const r = await fetch('/api/convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailConvite, cargo: cargoConvite }),
      })
      const dados = await r.json()
      if (r.ok) {
        setLinkGerado(dados.link)
        setEmailConvite('')
      } else {
        setMensagem('✗ ' + (dados.erro ?? 'Erro ao gerar convite'))
        setTimeout(() => setMensagem(''), 4000)
      }
    } catch {
      setMensagem('✗ Erro de comunicação')
    } finally {
      setEnviandoConvite(false)
    }
  }

  if (!cargo || !Permissoes.podeVerEquipe(cargo)) return null

  const iniciais = (nome: string) =>
    nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>Equipe</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
            {membros.length} membro{membros.length !== 1 ? 's' : ''} cadastrado{membros.length !== 1 ? 's' : ''}
          </p>
        </div>
        {podeConvidar && (
          <button
            onClick={() => { setModalConvite(true); setLinkGerado(''); setCargoConvite('OPERADOR') }}
            style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            + Convidar Membro
          </button>
        )}
      </div>

      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', backgroundColor: mensagem.startsWith('✓') ? 'var(--green-light)' : 'var(--red-light)', color: mensagem.startsWith('✓') ? 'var(--green)' : 'var(--red)', marginBottom: '16px' }}>
          {mensagem}
        </div>
      )}

      {/* Tabela de membros */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
              {['Membro', 'Email', 'Cargo', 'Status', 'Desde', ...((podeGerenciar || podeExcluir) ? ['Ações'] : [])].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={(podeGerenciar || podeExcluir) ? 6 : 5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Carregando...</td></tr>
            ) : membros.map(membro => (
              <tr key={membro.id} style={{ borderBottom: '1px solid var(--border)', opacity: membro.ativo ? 1 : 0.5 }}>
                {/* Membro */}
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {membro.avatarUrl ? (
                      <img src={membro.avatarUrl} alt={membro.nome} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', flexShrink: 0 }}>
                        {iniciais(membro.nome)}
                      </div>
                    )}
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', fontWeight: 500, color: 'var(--text-primary)' }}>{membro.nome}</span>
                  </div>
                </td>
                {/* Email */}
                <td style={{ padding: '12px 20px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>{membro.email}</td>
                {/* Cargo */}
                <td style={{ padding: '12px 20px' }}>
                  {podeGerenciar && membro.cargo !== 'ADMIN' && membro.id !== session?.user?.id ? (
                    <select
                      value={membro.cargo}
                      onChange={(e) => alterarCargo(membro.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                      <option value="SOCIO">Sócio</option>
                      <option value="GERENTE">Gerente</option>
                      <option value="OPERADOR">Operador</option>
                      <option value="VISUALIZADOR">Visualizador</option>
                    </select>
                  ) : (
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', backgroundColor: membro.cargo === 'ADMIN' ? 'var(--purple-light)' : 'var(--bg-hover)', color: membro.cargo === 'ADMIN' ? 'var(--purple-text)' : 'var(--text-secondary)' }}>
                      {labelCargo[membro.cargo]}
                    </span>
                  )}
                </td>
                {/* Status */}
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', backgroundColor: membro.ativo ? 'var(--green-light)' : 'var(--red-light)', color: membro.ativo ? 'var(--green)' : 'var(--red)' }}>
                    {membro.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                {/* Data */}
                <td style={{ padding: '12px 20px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                  {new Date(membro.createdAt).toLocaleDateString('pt-BR')}
                </td>
                {/* Ações */}
                {(podeGerenciar || podeExcluir) && (
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {podeGerenciar && membro.id !== session?.user?.id && membro.cargo !== 'ADMIN' && (
                        <button
                          onClick={() => alterarStatus(membro.id, !membro.ativo)}
                          style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: membro.ativo ? 'var(--red)' : 'var(--green)', cursor: 'pointer' }}
                        >
                          {membro.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      {podeExcluirMembro(membro) && (
                        <button
                          onClick={() => excluirMembro(membro.id, membro.nome)}
                          style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de convite */}
      {modalConvite && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) { setModalConvite(false); setLinkGerado('') } }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div className="modal-content" style={{ width: '100%', maxWidth: '440px', padding: '28px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Convidar Membro
            </h2>

            {linkGerado ? (
              <div>
                <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--green)', marginBottom: '12px' }}>✓ Convite gerado com sucesso! Copie o link abaixo e envie ao membro:</p>
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-all', marginBottom: '16px' }}>
                  {linkGerado}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => navigator.clipboard.writeText(linkGerado)} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Copiar Link
                  </button>
                  <button onClick={() => { setModalConvite(false); setLinkGerado('') }} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={gerarConvite}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={estiloLabel}>Email do novo membro *</label>
                  <input type="email" value={emailConvite} onChange={(e) => setEmailConvite(e.target.value)} required placeholder="email@exemplo.com" style={estiloInput}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={estiloLabel}>Cargo</label>
                  <select value={cargoConvite} onChange={(e) => setCargoConvite(e.target.value as typeof cargoConvite)} style={estiloInput}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                    {isAdmin && <option value="SOCIO">Sócio</option>}
                    <option value="GERENTE">Gerente</option>
                    <option value="OPERADOR">Operador</option>
                    <option value="VISUALIZADOR">Visualizador</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setModalConvite(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={enviandoConvite} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: enviandoConvite ? 'not-allowed' : 'pointer', opacity: enviandoConvite ? 0.7 : 1 }}>
                    {enviandoConvite ? 'Gerando...' : 'Gerar Convite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
