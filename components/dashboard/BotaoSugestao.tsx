'use client'

import { useState, useRef } from 'react'

type Tipo = 'MELHORIA' | 'BUG'

export function BotaoSugestao() {
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('MELHORIA')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [imagemBase64, setImagemBase64] = useState<string | null>(null)
  const [nomeImagem, setNomeImagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetar() {
    setTipo('MELHORIA')
    setTitulo('')
    setDescricao('')
    setImagemBase64(null)
    setNomeImagem('')
    setErro('')
    setEnviado(false)
  }

  function fechar() {
    setAberto(false)
    setTimeout(resetar, 200)
  }

  function handleImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErro('Apenas imagens são permitidas.')
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setErro('Imagem deve ter no máximo 4 MB.')
      return
    }

    setErro('')
    const reader = new FileReader()
    reader.onload = () => {
      setImagemBase64(reader.result as string)
      setNomeImagem(file.name)
    }
    reader.readAsDataURL(file)
  }

  function removerImagem() {
    setImagemBase64(null)
    setNomeImagem('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setErro('Informe um título.'); return }
    if (!descricao.trim()) { setErro('Descreva a sugestão.'); return }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/sugestoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          imagemBase64: imagemBase64 ?? null,
        }),
      })
      if (res.ok) {
        setEnviado(true)
      } else {
        const d = await res.json()
        setErro(d.erro ?? 'Erro ao enviar.')
      }
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setAberto(true); resetar() }}
        aria-label="Enviar sugestão ou reportar bug"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'var(--purple)',
          color: '#fff',
          fontSize: '22px',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(91,71,200,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(91,71,200,0.45)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,71,200,0.35)'
        }}
      >
        <span style={{ lineHeight: 1, marginTop: '-1px' }}>+</span>
      </button>

      {/* Modal */}
      {aberto && (
        <div
          onClick={e => { if (e.target === e.currentTarget) fechar() }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '16px', padding: '28px',
            width: '100%', maxWidth: '480px', border: '1px solid var(--border)',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}>
            {enviado ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {tipo === 'BUG' ? '🐛' : '💡'}
                </div>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Enviado com sucesso!
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '20px' }}>
                  Sua {tipo === 'BUG' ? 'ocorrência' : 'sugestão'} foi registrada e será analisada.
                </p>
                <button
                  onClick={fechar}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    background: 'var(--purple)', color: '#fff', fontSize: '14px',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>
                    Nova Sugestão
                  </h2>
                  <button onClick={fechar} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    ✕
                  </button>
                </div>

                {/* Seletor de tipo */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                  {([
                    { valor: 'MELHORIA' as Tipo, label: 'Melhoria', icone: '💡', desc: 'Sugestão de melhoria' },
                    { valor: 'BUG' as Tipo, label: 'Bug', icone: '🐛', desc: 'Reportar problema' },
                  ]).map(op => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setTipo(op.valor)}
                      style={{
                        flex: 1, padding: '14px 12px', borderRadius: '10px',
                        border: tipo === op.valor ? '2px solid var(--purple)' : '1px solid var(--border)',
                        background: tipo === op.valor ? 'var(--purple-light)' : 'var(--bg-page)',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s',
                      }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{op.icone}</div>
                      <div style={{
                        fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                        color: tipo === op.valor ? 'var(--purple-text)' : 'var(--text-primary)',
                      }}>
                        {op.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>
                        {op.desc}
                      </div>
                    </button>
                  ))}
                </div>

                <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{
                      display: 'block', fontSize: '12px', fontWeight: 600,
                      color: 'var(--text-secondary)', marginBottom: '6px',
                      textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                    }}>
                      Título *
                    </label>
                    <input
                      type="text"
                      placeholder={tipo === 'BUG' ? 'Ex: Botão não funciona na tela X' : 'Ex: Adicionar filtro por data'}
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      maxLength={200}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid var(--border)', background: 'var(--bg-page)',
                        fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block', fontSize: '12px', fontWeight: 600,
                      color: 'var(--text-secondary)', marginBottom: '6px',
                      textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                    }}>
                      Descrição *
                    </label>
                    <textarea
                      placeholder={tipo === 'BUG'
                        ? 'Descreva o que aconteceu, o que esperava e como reproduzir...'
                        : 'Descreva a melhoria que gostaria de ver no sistema...'
                      }
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid var(--border)', background: 'var(--bg-page)',
                        fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                      {descricao.length}/2000
                    </p>
                  </div>

                  {/* Upload de imagem */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: '12px', fontWeight: 600,
                      color: 'var(--text-secondary)', marginBottom: '6px',
                      textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif',
                    }}>
                      Anexar imagem
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImagem}
                      style={{ display: 'none' }}
                    />
                    {imagemBase64 ? (
                      <div style={{
                        borderRadius: '8px', border: '1px solid var(--border)',
                        background: 'var(--bg-page)', overflow: 'hidden',
                      }}>
                        <div style={{ position: 'relative' }}>
                          <img
                            src={imagemBase64}
                            alt="Pré-visualização"
                            style={{
                              width: '100%', maxHeight: '180px', objectFit: 'contain',
                              display: 'block', background: 'var(--bg-page)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={removerImagem}
                            style={{
                              position: 'absolute', top: '6px', right: '6px',
                              width: '24px', height: '24px', borderRadius: '50%',
                              border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff',
                              fontSize: '12px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{
                          padding: '8px 10px', borderTop: '1px solid var(--border)',
                          fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {nomeImagem}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '8px',
                          border: '1px dashed var(--border)', background: 'var(--bg-page)',
                          fontSize: '13px', color: 'var(--text-secondary)',
                          fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--purple)'
                          e.currentTarget.style.background = 'var(--purple-light)'
                          e.currentTarget.style.color = 'var(--purple-text)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'var(--bg-page)'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>📎</span>
                        Clique para anexar uma imagem (máx. 4 MB)
                      </button>
                    )}
                  </div>

                  {erro && <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{erro}</p>}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={fechar}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: '1px solid var(--border)', background: 'var(--bg-page)',
                        fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvando}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                        background: salvando ? 'var(--border)' : 'var(--purple)', color: '#fff',
                        fontSize: '14px', fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {salvando ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
