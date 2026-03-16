'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

interface Cliente {
  id: string
  nome: string
  empresa: string | null
}

interface OrcamentoOpcao {
  id: string
  numero: number
  revisao: number
  clienteNome: string
  status: string
}

interface ArquivoSelecionado {
  nome: string
  tipo: string
  tamanhoBytes: number
  conteudoBase64: string
}

const schemaPedido = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  prioridade: z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']),
  prazoEntrega: z.string().optional(),
  valorTotal: z.string().optional(),
  observacoes: z.string().optional(),
})

type ErrosFormulario = Partial<Record<keyof z.infer<typeof schemaPedido>, string>>

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
}

const estiloLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: '6px',
}

export default function PaginaNovoPedido() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [orcamentos, setOrcamentos] = useState<OrcamentoOpcao[]>([])
  const [arquivosSelecionados, setArquivosSelecionados] = useState<ArquivoSelecionado[]>([])
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const [clienteId, setClienteId] = useState('')
  const [orcamentoId, setOrcamentoId] = useState('')
  const [novoClienteAberto, setNovoClienteAberto] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteEmail, setNovoClienteEmail] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const [novoClienteEmpresa, setNovoClienteEmpresa] = useState('')
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [tipo, setTipo] = useState<'B2C' | 'B2B'>('B2C')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [erros, setErros] = useState<ErrosFormulario>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function buscarDados() {
      try {
        const [resClientes, resOrc] = await Promise.all([
          fetch('/api/clientes'),
          fetch('/api/orcamentos'),
        ])
        if (resClientes.ok) setClientes(await resClientes.json())
        if (resOrc.ok) {
          const lista = await resOrc.json()
          if (Array.isArray(lista)) {
            setOrcamentos(lista.map((o: { id: string; numero: number; revisao: number; clienteNome: string; status: string }) => ({
              id: o.id, numero: o.numero, revisao: o.revisao,
              clienteNome: o.clienteNome, status: o.status,
            })))
          }
        }
      } catch {
        // Silencioso
      } finally {
        setCarregandoClientes(false)
      }
    }
    buscarDados()
  }, [])

  function adicionarArquivo(file: File) {
    const MAX = 10 * 1024 * 1024
    if (file.size > MAX) { alert(`Arquivo "${file.name}" excede 10 MB.`); return }
    const reader = new FileReader()
    reader.onload = () => {
      setArquivosSelecionados(prev => [...prev, {
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        tamanhoBytes: file.size,
        conteudoBase64: reader.result as string,
      }])
    }
    reader.readAsDataURL(file)
  }

  function removerArquivo(idx: number) {
    setArquivosSelecionados(prev => prev.filter((_, i) => i !== idx))
  }

  function formatarTamanho(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function criarCliente() {
    if (!novoClienteNome.trim()) return
    setCriandoCliente(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoClienteNome,
          email: novoClienteEmail || null,
          telefone: novoClienteTelefone || null,
          empresa: novoClienteEmpresa || null,
        }),
      })
      if (res.ok) {
        const criado = await res.json()
        setClientes(prev => [...prev, criado])
        setClienteId(criado.id)
        setNovoClienteAberto(false)
        setNovoClienteNome('')
        setNovoClienteEmail('')
        setNovoClienteTelefone('')
        setNovoClienteEmpresa('')
      }
    } finally {
      setCriandoCliente(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErros({})
    setErroGeral('')

    const dadosFormulario = { clienteId, descricao, prioridade, prazoEntrega, valorTotal, observacoes, tipo, categoria }
    const validacao = schemaPedido.safeParse(dadosFormulario)

    if (!validacao.success) {
      const novosErros: ErrosFormulario = {}
      for (const issue of validacao.error.issues) {
        const campo = issue.path[0] as keyof ErrosFormulario
        novosErros[campo] = issue.message
      }
      setErros(novosErros)
      return
    }

    setEnviando(true)

    try {
      const payload: Record<string, unknown> = { clienteId, tipo, descricao, prioridade }
      if (categoria) payload.categoria = categoria
      if (prazoEntrega) payload.prazoEntrega = new Date(prazoEntrega).toISOString()
      if (valorTotal) payload.valorTotal = parseFloat(valorTotal)
      if (observacoes) payload.observacoes = observacoes
      if (orcamentoId) payload.orcamentoId = orcamentoId

      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErroGeral(dados.erro ?? 'Erro ao criar pedido')
      } else {
        // Upload de arquivos, se houver
        for (const arq of arquivosSelecionados) {
          await fetch(`/api/pedidos/${dados.id}/arquivos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(arq),
          })
        }
        router.push('/dashboard/pedidos')
      }
    } catch {
      setErroGeral('Erro de comunicação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Novo Pedido
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Preencha os dados do pedido
        </p>
      </div>

      <div style={{
        padding: '28px',
        borderRadius: '10px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <form onSubmit={handleSubmit}>
          {/* Tipo B2C / B2B */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {(['B2C', 'B2B'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px',
                fontFamily: 'Nunito, sans-serif', fontWeight: 600, cursor: 'pointer',
                border: tipo === t ? '2px solid var(--purple)' : '1px solid var(--border)',
                backgroundColor: tipo === t ? 'var(--purple-light)' : 'transparent',
                color: tipo === t ? 'var(--purple-text)' : 'var(--text-secondary)',
              }}>
                {t === 'B2C' ? 'B2C — Pessoa Física' : 'B2B — Empresa'}
              </button>
            ))}
          </div>

          {/* Cliente */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <option value="">
                {carregandoClientes ? 'Carregando...' : 'Selecione um cliente'}
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.empresa ? ` (${c.empresa})` : ''}
                </option>
              ))}
            </select>
            {erros.clienteId && (
              <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.clienteId}</p>
            )}
            <button
              type="button"
              onClick={() => setNovoClienteAberto(v => !v)}
              style={{ marginTop: '8px', fontSize: '12px', color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}
            >
              {novoClienteAberto ? '− Fechar' : '+ Cadastrar novo cliente'}
            </button>

            {novoClienteAberto && (
              <div style={{ marginTop: '12px', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'Nunito, sans-serif', color: 'var(--text-primary)', marginBottom: '12px' }}>Novo cliente</p>
                <div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ ...estiloLabel, fontSize: '12px' }}>Nome *</label>
                    <input style={estiloInput} value={novoClienteNome} onChange={e => setNovoClienteNome(e.target.value)} required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ ...estiloLabel, fontSize: '12px' }}>E-mail</label>
                      <input style={estiloInput} type="email" value={novoClienteEmail} onChange={e => setNovoClienteEmail(e.target.value)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </div>
                    <div>
                      <label style={{ ...estiloLabel, fontSize: '12px' }}>Telefone</label>
                      <input style={estiloInput} value={novoClienteTelefone} onChange={e => setNovoClienteTelefone(e.target.value)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...estiloLabel, fontSize: '12px' }}>Empresa (B2B)</label>
                    <input style={estiloInput} value={novoClienteEmpresa} onChange={e => setNovoClienteEmpresa(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                  </div>
                  <button type="button" onClick={criarCliente} disabled={criandoCliente} style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--purple)', color: '#fff',
                    border: 'none', cursor: criandoCliente ? 'not-allowed' : 'pointer', opacity: criandoCliente ? 0.7 : 1,
                  }}>
                    {criandoCliente ? 'Salvando...' : 'Criar e selecionar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Categoria */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Categoria</label>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Miniatura, Peça técnica, Protótipo..."
              style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Descrição *</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o pedido..."
              style={{ ...estiloInput, resize: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {erros.descricao && (
              <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.descricao}</p>
            )}
          </div>

          {/* Prioridade e Prazo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={estiloLabel}>Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label style={estiloLabel}>Prazo de Entrega</label>
              <input
                type="date"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Valor Total */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Valor Total (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="0,00"
              style={{ ...estiloInput, fontFamily: 'JetBrains Mono, monospace' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Observações */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Observações adicionais..."
              style={{ ...estiloInput, resize: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Orçamento vinculado (opcional) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Orçamento vinculado <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
            <select
              value={orcamentoId}
              onChange={(e) => setOrcamentoId(e.target.value)}
              style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <option value="">Nenhum</option>
              {orcamentos.map((o) => (
                <option key={o.id} value={o.id}>
                  ORC-{String(o.numero).padStart(4, '0')}-{String(o.revisao).padStart(2, '0')} — {o.clienteNome} ({o.status})
                </option>
              ))}
            </select>
            {orcamentoId && orcamentos.find(o => o.id === orcamentoId)?.status !== 'APROVADO' && (
              <p style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                ⚠ Este orçamento ainda não está APROVADO. O pedido só poderá ser aprovado após aprovação do orçamento.
              </p>
            )}
          </div>

          {/* Arquivos de referência */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Arquivos de referência <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(modelos 3D, imagens, etc.)</span></label>
            <div style={{ border: '1px dashed var(--border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--bg-page)' }}>
              {arquivosSelecionados.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {arquivosSelecionados.map((arq, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '16px' }}>{arq.tipo.startsWith('image/') ? '🖼' : arq.tipo.includes('stl') || arq.tipo.includes('obj') ? '📐' : '📎'}</span>
                        <div>
                          <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{arq.nome}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>{formatarTamanho(arq.tamanhoBytes)}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removerArquivo(idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => inputArquivoRef.current?.click()}
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', fontWeight: 500, backgroundColor: 'transparent', color: 'var(--purple)', border: '1px solid var(--purple-light)' }}
              >
                + Adicionar arquivo
              </button>
              <input
                ref={inputArquivoRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => { Array.from(e.target.files ?? []).forEach(adicionarArquivo); e.target.value = '' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '8px', marginBottom: 0 }}>
                Aceita qualquer tipo de arquivo · máx. 10 MB por arquivo
              </p>
            </div>
          </div>

          {/* Erro geral */}
          {erroGeral && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              backgroundColor: 'var(--red-light)',
              color: 'var(--red)',
              marginBottom: '18px',
            }}>
              {erroGeral}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 600,
                backgroundColor: enviando ? 'var(--purple-dark)' : 'var(--purple)',
                color: '#fff',
                border: 'none',
                cursor: enviando ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {enviando ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
