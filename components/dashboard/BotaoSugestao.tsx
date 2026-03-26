'use client'

import { useState } from 'react'

type Tipo = 'MELHORIA' | 'BUG'

export function BotaoSugestao() {
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('MELHORIA')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  function resetar() {
    setTipo('MELHORIA')
    setTitulo('')
    setDescricao('')
    setErro('')
    setEnviado(false)
  }

  function fechar() {
    setAberto(false)
    setTimeout(resetar, 200)
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
        body: JSON.stringify({ tipo, titulo: titulo.trim(), descricao: descricao.trim() }),
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
