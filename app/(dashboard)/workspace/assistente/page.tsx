'use client'

import { useState, useRef, useEffect } from 'react'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

function renderizarMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--purple-light);padding:1px 5px;border-radius:3px;font-family:JetBrains Mono,monospace;font-size:0.85em;color:var(--purple-text)">$1</code>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong style="color:var(--text-primary);font-size:1.05em">$1</strong>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>')
}

export default function PaginaAssistente() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const enderecoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    enderecoRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || carregando) return

    const novaMensagem: Mensagem = { role: 'user', content: input.trim() }
    const historicoAtualizado = [...mensagens, novaMensagem]

    setMensagens(historicoAtualizado)
    setInput('')
    setCarregando(true)

    try {
      const resposta = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historicoAtualizado }),
      })

      const dados = await resposta.json()

      if (resposta.ok && dados.content?.[0]?.text) {
        setMensagens([...historicoAtualizado, { role: 'assistant', content: dados.content[0].text }])
      } else {
        setMensagens([...historicoAtualizado, { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' }])
      }
    } catch {
      setMensagens([...historicoAtualizado, { role: 'assistant', content: 'Erro de conexão. Verifique sua internet e tente novamente.' }])
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '860px', margin: '0 auto', height: 'calc(100vh - 120px)' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Assistente IA
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Chat com acesso em tempo real ao ERP 3D Sinc
        </p>
      </div>

      {/* Área de chat */}
      <div style={{
        flex: 1,
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        minHeight: 0,
      }}>
        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-page)' }}>
          {/* Boas-vindas */}
          {mensagens.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '48px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', color: 'var(--purple)' }}>✦</div>
              <p style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Assistente 3D Sinc
              </p>
              <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                Pergunte sobre pedidos, estoque de filamentos, produção ou qualquer outra
                informação do sistema. Tenho acesso em tempo real aos dados do ERP.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
                {[
                  'Quais pedidos estão atrasados?',
                  'Como está o estoque de filamentos?',
                  'Quais pedidos estão em produção?',
                ].map((sugestao) => (
                  <button
                    key={sugestao}
                    onClick={() => setInput(sugestao)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'Inter, sans-serif',
                      cursor: 'pointer',
                      backgroundColor: 'var(--purple-light)',
                      border: '1px solid var(--border)',
                      color: 'var(--purple-text)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--purple)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de mensagens */}
          {mensagens.map((msg, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  fontFamily: 'Inter, sans-serif',
                  backgroundColor: msg.role === 'user' ? 'var(--purple)' : 'var(--bg-surface)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : undefined,
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : undefined,
                }}
                dangerouslySetInnerHTML={
                  msg.role === 'assistant'
                    ? { __html: renderizarMarkdown(msg.content) }
                    : undefined
                }
              >
                {msg.role === 'user' ? msg.content : undefined}
              </div>
            </div>
          ))}

          {/* Indicador de carregamento */}
          {carregando && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                borderTopLeftRadius: '4px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div
                      key={i}
                      className="animate-bounce"
                      style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        backgroundColor: 'var(--purple)',
                        animationDelay: `${delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={enderecoRef} />
        </div>

        {/* Input de mensagem */}
        <div style={{ flexShrink: 0, padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <form onSubmit={enviarMensagem} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={carregando}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text-primary)',
                backgroundColor: '#fff',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--purple)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || carregando}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'Nunito, sans-serif',
                color: '#fff',
                border: 'none',
                backgroundColor: !input.trim() || carregando ? 'var(--purple-dark)' : 'var(--purple)',
                cursor: !input.trim() || carregando ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || carregando ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
