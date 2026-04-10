'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import StlPreviewDynamic from '@/components/StlPreviewDynamic'

type Etapa = 'SOLICITACAO' | 'CUSTO_VIABILIDADE' | 'APROVACAO' | 'PRODUCAO' | 'CALCULO_FRETE' | 'ENVIADO' | 'FINALIZADO' | 'CANCELADO'

interface ItemWS {
  id: string
  descricao: string
  referencia: string | null
  quantidade: number
  valorUnitario: number | null
  custoUnitario: number | null
}

interface Solicitacao {
  id: string
  numero: number
  etapa: Etapa
  clienteNome: string
  clienteEmail: string | null
  clienteTelefone: string | null
  tipoPessoa: string | null
  infoAdicional: string | null
  observacoes: string | null
  pacoteAltura: number | null
  pacoteLargura: number | null
  pacoteComprimento: number | null
  pacotePeso: number | null
  frete: number | null
  dataInicioProducao: string | null
  dataFimProducao: string | null
  dataEnvio: string | null
  horaEnvio: string | null
  codigoRastreio: string | null
  tokenPortal: string | null
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'
  dataEntrega: string | null
  orcamentoId: string | null
  pedidoId: string | null
  clienteId: string | null
  createdAt: string
  itens: ItemWS[]
}

type PrioridadeTipo = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'

const labelPrioridade: Record<PrioridadeTipo, string> = {
  BAIXA: 'Baixa', NORMAL: 'Normal', ALTA: 'Alta', URGENTE: 'Urgente',
}
const corPrioridade: Record<PrioridadeTipo, { bg: string; texto: string }> = {
  BAIXA:   { bg: '#F3F2EF', texto: '#6B6860' },
  NORMAL:  { bg: '#EDE9FC', texto: '#4C3DB5' },
  ALTA:    { bg: '#FEF3E2', texto: '#8A5A0A' },
  URGENTE: { bg: '#FCE9E9', texto: '#B83232' },
}

const ETAPAS_ATIVAS: Etapa[] = ['SOLICITACAO', 'CUSTO_VIABILIDADE', 'APROVACAO', 'PRODUCAO', 'CALCULO_FRETE', 'ENVIADO']
const ETAPAS_TERMINAIS: Etapa[] = ['FINALIZADO', 'CANCELADO']

const labelEtapa: Record<Etapa, string> = {
  SOLICITACAO:       'Solicitação',
  CUSTO_VIABILIDADE: 'Custo e Viabilidade',
  APROVACAO:         'Aguardando Aprovação',
  PRODUCAO:          'Produção',
  CALCULO_FRETE:     'Cálculo de Frete',
  ENVIADO:           'Enviado',
  FINALIZADO:        'Finalizado',
  CANCELADO:         'Cancelado',
}

const corEtapa: Record<Etapa, { borda: string; header: string; texto: string }> = {
  SOLICITACAO:       { borda: '#5B47C8', header: '#EDE9FC', texto: '#4C3DB5' },
  CUSTO_VIABILIDADE: { borda: '#8A5A0A', header: '#FEF3E2', texto: '#8A5A0A' },
  APROVACAO:         { borda: '#1A6B42', header: '#E8F5EE', texto: '#1A6B42' },
  PRODUCAO:          { borda: '#4C3DB5', header: '#EDE9FC', texto: '#4C3DB5' },
  CALCULO_FRETE:     { borda: '#7C5A14', header: '#FEF3E2', texto: '#7C5A14' },
  ENVIADO:           { borda: '#6B6860', header: '#F3F2EF', texto: '#6B6860' },
  FINALIZADO:        { borda: '#1A6B42', header: '#E8F5EE', texto: '#1A6B42' },
  CANCELADO:         { borda: '#B83232', header: '#FCE9E9', texto: '#B83232' },
}

const PROXIMA_ETAPA: Partial<Record<Etapa, Etapa>> = {
  SOLICITACAO:       'CUSTO_VIABILIDADE',
  CUSTO_VIABILIDADE: 'APROVACAO',
  PRODUCAO:          'CALCULO_FRETE',
  CALCULO_FRETE:     'ENVIADO',
  ENVIADO:           'FINALIZADO',
}

// Lote 16: permite retroceder o pedido entre as etapas anteriores
const ETAPA_ANTERIOR: Partial<Record<Etapa, Etapa>> = {
  CUSTO_VIABILIDADE: 'SOLICITACAO',
  APROVACAO:         'CUSTO_VIABILIDADE',
  PRODUCAO:          'APROVACAO',
  CALCULO_FRETE:     'PRODUCAO',
  ENVIADO:           'CALCULO_FRETE',
}

const estiloInput: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)', backgroundColor: '#fff', outline: 'none',
  boxSizing: 'border-box',
}
const estiloLabel: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: '4px', fontFamily: 'Inter, sans-serif',
}

export default function PaginaWorkspace() {
  const { data: session } = useSession()

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaTerminal, setAbaTerminal] = useState<Etapa | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<Solicitacao | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [confirmFinalizar, setConfirmFinalizar] = useState(false)

  // Filtro de prioridade
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeTipo | ''>('')

  // Form state
  const [form, setForm] = useState({
    clienteNome: '', clienteEmail: '', clienteTelefone: '', tipoPessoa: '' as '' | 'PF' | 'PJ',
    observacoes: '', infoAdicional: '', prioridade: 'NORMAL' as PrioridadeTipo, dataEntrega: '',
  })
  const [itens, setItens] = useState<{ descricao: string; referencia: string; quantidade: number; valorUnitario: string }[]>([
    { descricao: '', referencia: '', quantidade: 1, valorUnitario: '' },
  ])

  // Autocomplete de clientes
  const [clientesSugestoes, setClientesSugestoes] = useState<{ id: string; nome: string; email: string | null; telefone: string | null; cpfCnpj: string | null }[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sugestoesRef = useRef<HTMLDivElement>(null)

  const buscarClientes = useCallback(async (termo: string) => {
    if (termo.length < 2) { setClientesSugestoes([]); return }
    try {
      const r = await fetch(`/api/clientes?busca=${encodeURIComponent(termo)}&limite=6`)
      if (r.ok) {
        const dados = await r.json()
        setClientesSugestoes(Array.isArray(dados) ? dados : dados.clientes ?? [])
      }
    } catch { /* ignora */ }
  }, [])

  const onChangeNomeCliente = (valor: string) => {
    setForm(f => ({ ...f, clienteNome: valor }))
    setMostrarSugestoes(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscarClientes(valor), 300)
  }

  const selecionarCliente = (c: typeof clientesSugestoes[0]) => {
    setForm(f => ({
      ...f,
      clienteNome: c.nome,
      clienteEmail: c.email ?? '',
      clienteTelefone: c.telefone ?? '',
      tipoPessoa: c.cpfCnpj ? (c.cpfCnpj.length > 14 ? 'PJ' : 'PF') : '',
    }))
    setMostrarSugestoes(false)
    setClientesSugestoes([])
  }

  // Detalhe edit state
  const [detalheItens, setDetalheItens] = useState<ItemWS[]>([])
  const [detalheFrete, setDetalheFrete] = useState('')
  const [detalhePacoteAltura, setDetalhePacoteAltura] = useState('')
  const [detalhePacoteLargura, setDetalhePacoteLargura] = useState('')
  const [detalhePacoteComprimento, setDetalhePacoteComprimento] = useState('')
  const [detalhePacotePeso, setDetalhePacotePeso] = useState('')
  const [detalheDataEnvio, setDetalheDataEnvio] = useState('')
  const [detalheHoraEnvio, setDetalheHoraEnvio] = useState('')
  const [detalheCodigoRastreio, setDetalheCodigoRastreio] = useState('')
  const [detalheDataEntrega, setDetalheDataEntrega] = useState('')

  // Arquivos do pedido vinculado
  interface ArquivoInfo { id: string; nome: string; tipo: string; tamanhoBytes: number; blobUrl?: string | null; itemWorkspaceId?: string | null; createdAt: string }
  const [arquivos, setArquivos] = useState<ArquivoInfo[]>([])
  const [uploadando, setUploadando] = useState(false)
  const [uploadErro, setUploadErro] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [stlPreviewUrl, setStlPreviewUrl] = useState<string | null>(null)
  const [loadingArquivo, setLoadingArquivo] = useState<Record<string, string>>({})

  const carregarArquivos = useCallback(async (pedidoId: string) => {
    try {
      const r = await fetch(`/api/pedidos/${pedidoId}/arquivos`)
      if (r.ok) setArquivos(await r.json())
    } catch { setArquivos([]) }
  }, [])

  async function uploadArquivo(pedidoId: string, file: File, itemWorkspaceId?: string | null) {
    // Upload via FormData → server-side `put()` no Vercel Blob.
    // Substituiu o client SDK do @vercel/blob, que estava sendo abortado em dev.
    // Limite de 30 MB (proxyClientMaxBodySize no next.config).
    if (file.size > 30 * 1024 * 1024) {
      setUploadErro('Arquivo muito grande (máx. 30 MB).')
      setTimeout(() => setUploadErro(''), 5000)
      return
    }
    setUploadando(true)
    setUploadErro('')

    // Timeout duro de 120s — abort controlado, sem "carregando infinito"
    const ctrl = new AbortController()
    const timeoutId = setTimeout(() => ctrl.abort(), 120_000)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (itemWorkspaceId) formData.append('itemWorkspaceId', itemWorkspaceId)

      console.log('[upload] iniciando', { nome: file.name, tamanhoBytes: file.size, itemWorkspaceId })
      const r = await fetch(`/api/pedidos/${pedidoId}/arquivos`, {
        method: 'POST',
        body: formData,
        signal: ctrl.signal,
      })

      if (r.ok) {
        const novo = await r.json()
        setArquivos(prev => [...prev, novo])
        console.log('[upload] registrado no banco', novo.id)
      } else {
        const err = await r.json().catch(() => ({ erro: `Erro ${r.status}` }))
        const msg = 'Erro upload: ' + (err.erro ?? `Falha (${r.status})`)
        console.error('[upload] falha', r.status, err)
        setUploadErro(msg)
        setTimeout(() => setUploadErro(''), 6000)
      }
    } catch (e) {
      const aborted = e instanceof Error && (e.name === 'AbortError' || e.message.includes('aborted'))
      const msg = aborted
        ? 'Upload cancelado: tempo esgotado (120s).'
        : 'Erro upload: ' + (e instanceof Error ? e.message : 'Falha de rede')
      console.error('[upload] erro', e)
      setUploadErro(msg)
      setTimeout(() => setUploadErro(''), 8000)
    } finally {
      clearTimeout(timeoutId)
      setUploadando(false)
    }
  }

  async function excluirArquivo(pedidoId: string, arquivoId: string) {
    if (!confirm('Excluir este arquivo?')) return
    const r = await fetch(`/api/pedidos/${pedidoId}/arquivos?arquivoId=${arquivoId}`, { method: 'DELETE' })
    if (r.ok) setArquivos(prev => prev.filter(a => a.id !== arquivoId))
  }

  async function downloadArquivo(pedidoId: string, arquivoId: string, nome: string) {
    setLoadingArquivo(prev => ({ ...prev, [arquivoId]: 'baixar' }))
    try {
      // Sempre via proxy server-side (Blob Store é private, URL direta dá 403)
      const r = await fetch(`/api/pedidos/${pedidoId}/arquivos/${arquivoId}`)
      if (r.ok) {
        const blob = await r.blob()
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = nome
        link.click()
        URL.revokeObjectURL(objectUrl)
      }
    } finally { setLoadingArquivo(prev => { const n = { ...prev }; delete n[arquivoId]; return n }) }
  }

  async function previewArquivo(pedidoId: string, arquivoId: string) {
    setLoadingArquivo(prev => ({ ...prev, [arquivoId]: 'preview' }))
    try {
      const r = await fetch(`/api/pedidos/${pedidoId}/arquivos/${arquivoId}`)
      if (r.ok) {
        const blob = await r.blob()
        setPreviewUrl(URL.createObjectURL(blob))
      }
    } finally { setLoadingArquivo(prev => { const n = { ...prev }; delete n[arquivoId]; return n }) }
  }

  const cargo = session?.user?.cargo

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/workspace')
      if (r.ok) setSolicitacoes(await r.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (cargo) carregar()
  }, [cargo, carregar])

  // Sync detalhe edit state when detalheAberto changes
  useEffect(() => {
    if (detalheAberto) {
      setDetalheItens(detalheAberto.itens.map(it => ({ ...it })))
      setDetalheFrete(detalheAberto.frete != null ? String(detalheAberto.frete) : '')
      setDetalhePacoteAltura(detalheAberto.pacoteAltura != null ? String(detalheAberto.pacoteAltura) : '')
      setDetalhePacoteLargura(detalheAberto.pacoteLargura != null ? String(detalheAberto.pacoteLargura) : '')
      setDetalhePacoteComprimento(detalheAberto.pacoteComprimento != null ? String(detalheAberto.pacoteComprimento) : '')
      setDetalhePacotePeso(detalheAberto.pacotePeso != null ? String(detalheAberto.pacotePeso) : '')
      setDetalheDataEnvio(detalheAberto.dataEnvio ? detalheAberto.dataEnvio.slice(0, 10) : '')
      setDetalheHoraEnvio(detalheAberto.horaEnvio ?? '')
      setDetalheCodigoRastreio(detalheAberto.codigoRastreio ?? '')
      setDetalheDataEntrega(detalheAberto.dataEntrega ? detalheAberto.dataEntrega.slice(0, 10) : '')
      setConfirmFinalizar(false)
      setPreviewUrl(null)
      setUploadErro('')
      if (stlPreviewUrl) { URL.revokeObjectURL(stlPreviewUrl); setStlPreviewUrl(null) }
      if (detalheAberto.pedidoId) carregarArquivos(detalheAberto.pedidoId)
      else setArquivos([])
    }
  }, [detalheAberto, carregarArquivos])

  if (!cargo) return null

  function soliPorEtapa(etapa: Etapa) {
    let lista = solicitacoes.filter(s => s.etapa === etapa)
    if (filtroPrioridade) lista = lista.filter(s => s.prioridade === filtroPrioridade)
    // Ordena: URGENTE > ALTA > NORMAL > BAIXA
    const pesoPrioridade: Record<string, number> = { URGENTE: 0, ALTA: 1, NORMAL: 2, BAIXA: 3 }
    lista.sort((a, b) => (pesoPrioridade[a.prioridade] ?? 2) - (pesoPrioridade[b.prioridade] ?? 2))
    return lista
  }

  async function avancarEtapa(id: string, novaEtapa: Etapa, dadosExtras?: Record<string, unknown>) {
    const r = await fetch(`/api/workspace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: novaEtapa, ...dadosExtras }),
    })
    if (r.ok) {
      const atualizado = await r.json()
      setSolicitacoes(prev => prev.map(s => s.id === id ? atualizado : s))
      if (detalheAberto?.id === id) setDetalheAberto(atualizado)
      setMensagem('')
    } else {
      const dados = await r.json()
      setMensagem('✗ ' + (dados.erro ?? 'Erro ao avançar'))
      setTimeout(() => setMensagem(''), 5000)
    }
  }

  async function cancelar(id: string) {
    await avancarEtapa(id, 'CANCELADO')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta solicitação permanentemente?')) return
    try {
      const r = await fetch(`/api/workspace/${id}`, { method: 'DELETE' })
      if (r.ok) {
        setSolicitacoes(prev => prev.filter(s => s.id !== id))
        if (detalheAberto?.id === id) setDetalheAberto(null)
      } else {
        const dados = await r.json()
        setMensagem('✗ ' + (dados.erro ?? 'Erro ao excluir'))
        setTimeout(() => setMensagem(''), 4000)
      }
    } catch {
      setMensagem('✗ Erro de rede ao excluir')
      setTimeout(() => setMensagem(''), 4000)
    }
  }

  function addItem() {
    setItens(prev => [...prev, { descricao: '', referencia: '', quantidade: 1, valorUnitario: '' }])
  }

  function removeItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function setItem(idx: number, campo: string, valor: string | number) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  function setDetalheItem(idx: number, campo: string, valor: unknown) {
    setDetalheItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  function removerDetalheItem(idx: number) {
    if (!confirm('Remover este item do pedido?')) return
    setDetalheItens(prev => prev.filter((_, i) => i !== idx))
  }

  function adicionarDetalheItem() {
    setDetalheItens(prev => [...prev, {
      id: '', descricao: '', referencia: null, quantidade: 1, valorUnitario: null, custoUnitario: null,
    }])
  }

  async function criarSolicitacao(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clienteNome.trim()) return
    setSalvando(true)
    setMensagem('')
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome:     form.clienteNome.trim(),
          clienteEmail:    form.clienteEmail || null,
          clienteTelefone: form.clienteTelefone || null,
          tipoPessoa:      form.tipoPessoa || null,
          observacoes:     form.observacoes || null,
          prioridade:      form.prioridade,
          dataEntrega:     form.dataEntrega || null,
          itens: itens.filter(it => it.descricao.trim()).map(it => ({
            descricao:    it.descricao.trim(),
            referencia:   it.referencia || null,
            quantidade:   it.quantidade,
            valorUnitario: it.valorUnitario ? parseFloat(it.valorUnitario) : null,
          })),
        }),
      })
      if (r.ok) {
        const nova = await r.json()
        setSolicitacoes(prev => [nova, ...prev])
        setModalAberto(false)
        setForm({ clienteNome: '', clienteEmail: '', clienteTelefone: '', tipoPessoa: '', observacoes: '', infoAdicional: '', prioridade: 'NORMAL', dataEntrega: '' })
        setItens([{ descricao: '', referencia: '', quantidade: 1, valorUnitario: '' }])
      } else {
        const dados = await r.json()
        setMensagem('✗ ' + (dados.erro ?? 'Erro ao criar'))
        setTimeout(() => setMensagem(''), 4000)
      }
    } finally {
      setSalvando(false)
    }
  }

  async function salvarDetalhes(): Promise<boolean> {
    if (!detalheAberto) return false
    setSalvando(true)
    try {
      const r = await fetch(`/api/workspace/${detalheAberto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infoAdicional: detalheAberto.infoAdicional,
          observacoes:   detalheAberto.observacoes,
          pacoteAltura:      detalhePacoteAltura ? parseFloat(detalhePacoteAltura) : null,
          pacoteLargura:     detalhePacoteLargura ? parseFloat(detalhePacoteLargura) : null,
          pacoteComprimento: detalhePacoteComprimento ? parseFloat(detalhePacoteComprimento) : null,
          pacotePeso:        detalhePacotePeso ? parseFloat(detalhePacotePeso) : null,
          frete:         detalheFrete ? parseFloat(detalheFrete) : null,
          dataEnvio:     detalheDataEnvio || null,
          horaEnvio:     detalheHoraEnvio || null,
          codigoRastreio: detalheCodigoRastreio || null,
          dataEntrega:   detalheDataEntrega || null,
          itens: detalheItens.map(it => ({
            descricao:     it.descricao,
            referencia:    it.referencia || null,
            quantidade:    Number(it.quantidade) || 1,
            valorUnitario: it.valorUnitario != null ? Number(it.valorUnitario) : null,
            custoUnitario: it.custoUnitario != null ? Number(it.custoUnitario) : null,
          })),
        }),
      })
      if (r.ok) {
        const atualizado = await r.json()
        setSolicitacoes(prev => prev.map(s => s.id === atualizado.id ? atualizado : s))
        setDetalheAberto(atualizado)
        setMensagem('✓ Salvo')
        setTimeout(() => setMensagem(''), 2000)
        return true
      } else {
        const dados = await r.json().catch(() => ({ erro: `Erro ${r.status}` }))
        const detalhe = dados.detalhe ? ` (${dados.detalhe})` : ''
        setMensagem('✗ ' + (dados.erro ?? 'Erro ao salvar') + detalhe)
        setTimeout(() => setMensagem(''), 6000)
        return false
      }
    } catch (e) {
      setMensagem('✗ Erro de rede ao salvar' + (e instanceof Error ? ` (${e.message})` : ''))
      setTimeout(() => setMensagem(''), 6000)
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function gerarTokenPortal(id: string) {
    const r = await fetch(`/api/workspace/${id}/token-portal`, { method: 'POST' })
    if (r.ok) {
      const { token } = await r.json()
      const url = `${window.location.origin}/portal/pedido/${token}`
      await navigator.clipboard.writeText(url)
      setMensagem('✓ Link do portal copiado!')
      // Atualizar token local
      setSolicitacoes(prev => prev.map(s => s.id === id ? { ...s, tokenPortal: token } : s))
      if (detalheAberto?.id === id) setDetalheAberto(d => d ? { ...d, tokenPortal: token } : d)
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  const totalAtivos = ETAPAS_ATIVAS.reduce((acc, e) => acc + soliPorEtapa(e).length, 0)
  const totalFinalizados = soliPorEtapa('FINALIZADO').length
  const totalCancelados  = soliPorEtapa('CANCELADO').length

  // --- Render helpers for detail modal per etapa ---

  // Lote 16: render arquivos vinculados a um item específico do workspace.
  // Renderiza dentro do card do item — botão de upload + lista de arquivos do item.
  function renderArquivosItem(itemId: string) {
    if (!detalheAberto?.pedidoId) return null
    const arquivosDoItem = arquivos.filter(a => a.itemWorkspaceId === itemId)
    return (
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Arquivos do item ({arquivosDoItem.length})
          </span>
          {cargo !== 'VISUALIZADOR' && (
            <label style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', cursor: uploadando ? 'not-allowed' : 'pointer', backgroundColor: 'transparent', opacity: uploadando ? 0.6 : 1 }}>
              {uploadando ? 'Enviando...' : '+ Upload'}
              <input
                type="file" hidden disabled={uploadando}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f && detalheAberto.pedidoId) uploadArquivo(detalheAberto.pedidoId, f, itemId)
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>
        {arquivosDoItem.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {arquivosDoItem.map(arq => {
              const isImagem = arq.tipo.startsWith('image/')
              const isStl = /\.stl$/i.test(arq.nome)
              const tamanho = arq.tamanhoBytes < 1024 ? `${arq.tamanhoBytes} B` : arq.tamanhoBytes < 1048576 ? `${(arq.tamanhoBytes / 1024).toFixed(1)} KB` : `${(arq.tamanhoBytes / 1048576).toFixed(1)} MB`
              return (
                <div key={arq.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{arq.nome}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{tamanho}</span>
                  {isImagem && (
                    <button
                      disabled={!!loadingArquivo[arq.id]}
                      onClick={() => previewArquivo(detalheAberto.pedidoId!, arq.id)}
                      style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', border: '1px solid var(--border)', backgroundColor: loadingArquivo[arq.id] === 'preview' ? 'var(--purple-light)' : 'transparent', color: 'var(--purple)', cursor: loadingArquivo[arq.id] ? 'wait' : 'pointer' }}
                    >
                      {loadingArquivo[arq.id] === 'preview' ? '...' : 'Preview'}
                    </button>
                  )}
                  {isStl && (
                    <button
                      disabled={!!loadingArquivo[arq.id]}
                      onClick={async () => {
                        setLoadingArquivo(prev => ({ ...prev, [arq.id]: '3d' }))
                        try {
                          const url = `/api/pedidos/${detalheAberto.pedidoId!}/arquivos/${arq.id}`
                          const r = await fetch(url)
                          if (r.ok) { const blob = await r.blob(); setStlPreviewUrl(URL.createObjectURL(blob)) }
                        } finally { setLoadingArquivo(prev => { const n = { ...prev }; delete n[arq.id]; return n }) }
                      }}
                      style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', border: '1px solid var(--border)', backgroundColor: loadingArquivo[arq.id] === '3d' ? 'var(--purple-light)' : 'transparent', color: 'var(--purple)', cursor: loadingArquivo[arq.id] ? 'wait' : 'pointer' }}
                    >
                      {loadingArquivo[arq.id] === '3d' ? '...' : '3D'}
                    </button>
                  )}
                  <button
                    disabled={!!loadingArquivo[arq.id]}
                    onClick={() => downloadArquivo(detalheAberto.pedidoId!, arq.id, arq.nome)}
                    style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: loadingArquivo[arq.id] ? 'wait' : 'pointer' }}
                  >
                    {loadingArquivo[arq.id] === 'baixar' ? '...' : '↓'}
                  </button>
                  {cargo !== 'VISUALIZADOR' && (
                    <button onClick={() => excluirArquivo(detalheAberto.pedidoId!, arq.id)} style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderItensDetalhe() {
    const etapa = detalheAberto!.etapa
    // Lote 16: pode editar descrição/quantidade em qualquer etapa não-terminal,
    // valores (R$) a partir de CUSTO_VIABILIDADE.
    const isTerminal = etapa === 'FINALIZADO' || etapa === 'CANCELADO'
    const podeEditar = !isTerminal
    const podeEditarValores = !isTerminal && etapa !== 'SOLICITACAO'

    return (
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Itens</p>
        {detalheItens.map((it, i) => {
          const total = (it.valorUnitario ?? 0) * it.quantidade
          const custoTotal = (it.custoUnitario ?? 0) * it.quantidade
          const lucro = total - custoTotal
          return (
            <div key={it.id || i} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)', borderRadius: '6px', padding: '10px 12px', marginBottom: '4px' }}>
              {/* Lote 16: editar descrição/quantidade em qualquer etapa não-terminal, com botão ✕ para excluir */}
              {podeEditar ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 3 }}>
                    <label style={estiloLabel}>Descrição</label>
                    <input style={estiloInput} value={it.descricao} onChange={e => setDetalheItem(i, 'descricao', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={estiloLabel}>Qtd</label>
                    <input style={estiloInput} type="number" min={1} value={it.quantidade} onChange={e => setDetalheItem(i, 'quantidade', parseInt(e.target.value) || 1)} />
                  </div>
                  {detalheItens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerDetalheItem(i)}
                      title="Remover item"
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>{it.descricao}</p>
                    {it.referencia && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>{it.referencia}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', margin: '0 0 2px' }}>Qtd: {it.quantidade}</p>
                  </div>
                </div>
              )}

              {/* Lote 16: valores editáveis a partir de CUSTO_VIABILIDADE em qualquer etapa não-terminal */}
              {podeEditarValores && (
                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={estiloLabel}>Valor unitário *</label>
                    <input
                      style={estiloInput} type="number" step="0.01" min="0"
                      value={it.valorUnitario ?? ''}
                      onChange={e => setDetalheItem(i, 'valorUnitario', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    {it.valorUnitario != null && (
                      <p style={{ fontSize: '11px', color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', margin: '4px 0 0' }}>
                        Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={estiloLabel}>Custo unitário</label>
                    <input
                      style={estiloInput} type="number" step="0.01" min="0"
                      value={it.custoUnitario ?? ''}
                      onChange={e => setDetalheItem(i, 'custoUnitario', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    {it.custoUnitario != null && (
                      <>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', margin: '4px 0 0' }}>
                          Custo: R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {it.valorUnitario != null && (
                          <p style={{ fontSize: '11px', color: lucro >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'JetBrains Mono, monospace', margin: '2px 0 0' }}>
                            Lucro: R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Read-only display only para etapas terminais (FINALIZADO/CANCELADO) */}
              {isTerminal && it.valorUnitario != null && (
                <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', margin: '4px 0 0' }}>
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}

              {/* Lote 16: arquivos por item — só aparece se o item já estiver salvo (id válido) e houver pedido vinculado */}
              {it.id && detalheAberto?.pedidoId && renderArquivosItem(it.id)}
            </div>
          )
        })}

        {/* Lote 16: Adicionar item — disponível em qualquer etapa não-terminal */}
        {podeEditar && (
          <button
            type="button"
            onClick={adicionarDetalheItem}
            style={{ marginTop: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px dashed var(--purple)', backgroundColor: 'transparent', color: 'var(--purple)', cursor: 'pointer', width: '100%' }}
          >
            + Adicionar item
          </button>
        )}

        {/* Totals row */}
        {detalheItens.some(it => it.valorUnitario != null) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
              Total: R$ {detalheItens.reduce((acc, it) => acc + (it.valorUnitario ?? 0) * it.quantidade, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    )
  }

  function renderCamposEtapa() {
    if (!detalheAberto) return null
    const etapa = detalheAberto.etapa

    return (
      <>
        {/* Produção: data início */}
        {(etapa === 'PRODUCAO' || etapa === 'CALCULO_FRETE' || etapa === 'ENVIADO' || etapa === 'FINALIZADO') && detalheAberto.dataInicioProducao && (
          <div style={{ marginBottom: '12px' }}>
            <label style={estiloLabel}>Início da Produção</label>
            <p style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', margin: 0 }}>
              {new Date(detalheAberto.dataInicioProducao).toLocaleString('pt-BR')}
            </p>
          </div>
        )}
        {(etapa === 'CALCULO_FRETE' || etapa === 'ENVIADO' || etapa === 'FINALIZADO') && detalheAberto.dataFimProducao && (
          <div style={{ marginBottom: '12px' }}>
            <label style={estiloLabel}>Fim da Produção</label>
            <p style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', margin: 0 }}>
              {new Date(detalheAberto.dataFimProducao).toLocaleString('pt-BR')}
            </p>
          </div>
        )}

        {/* Cálculo de Frete: dimensões do pacote + frete */}
        {etapa === 'CALCULO_FRETE' && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Dimensões do Pacote</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={estiloLabel}>Altura (cm)</label>
                <input style={estiloInput} type="number" step="0.1" min="0" value={detalhePacoteAltura} onChange={e => setDetalhePacoteAltura(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={estiloLabel}>Largura (cm)</label>
                <input style={estiloInput} type="number" step="0.1" min="0" value={detalhePacoteLargura} onChange={e => setDetalhePacoteLargura(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={estiloLabel}>Comprimento (cm)</label>
                <input style={estiloInput} type="number" step="0.1" min="0" value={detalhePacoteComprimento} onChange={e => setDetalhePacoteComprimento(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={estiloLabel}>Peso (kg)</label>
                <input style={estiloInput} type="number" step="0.001" min="0" value={detalhePacotePeso} onChange={e => setDetalhePacotePeso(e.target.value)} placeholder="0" />
              </div>
            </div>
            <label style={estiloLabel}>Frete (R$) *</label>
            <input
              style={estiloInput} type="number" step="0.01" min="0"
              value={detalheFrete}
              onChange={e => setDetalheFrete(e.target.value)}
              placeholder="0.00"
            />
          </div>
        )}

        {/* Enviado: campos de envio */}
        {etapa === 'ENVIADO' && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Dados de Envio</p>
            {(detalheAberto.pacoteAltura != null || detalheAberto.pacoteLargura != null || detalheAberto.pacoteComprimento != null || detalheAberto.pacotePeso != null) && (
              <p style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Pacote: {detalheAberto.pacoteAltura ?? '—'} × {detalheAberto.pacoteLargura ?? '—'} × {detalheAberto.pacoteComprimento ?? '—'} cm — {detalheAberto.pacotePeso ?? '—'} kg
              </p>
            )}
            {detalheAberto.frete != null && (
              <p style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Frete: R$ {Number(detalheAberto.frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={estiloLabel}>Data de Envio</label>
                <input style={estiloInput} type="date" value={detalheDataEnvio} onChange={e => setDetalheDataEnvio(e.target.value)} />
              </div>
              <div>
                <label style={estiloLabel}>Hora de Envio</label>
                <input style={estiloInput} type="time" value={detalheHoraEnvio} onChange={e => setDetalheHoraEnvio(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={estiloLabel}>Código de Rastreio</label>
              <input style={estiloInput} value={detalheCodigoRastreio} onChange={e => setDetalheCodigoRastreio(e.target.value)} placeholder="Ex.: BR123456789XX" />
            </div>
          </div>
        )}
      </>
    )
  }

  function renderAcoesDetalhe() {
    if (!detalheAberto) return null
    const etapa = detalheAberto.etapa

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {/* Aprovação: 3 botões específicos */}
        {etapa === 'APROVACAO' && (
          <>
            <button
              onClick={() => avancarEtapa(detalheAberto.id, 'PRODUCAO')}
              style={{ flex: 2, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer', minWidth: '120px' }}
            >
              Aprovar
            </button>
            <button
              onClick={() => avancarEtapa(detalheAberto.id, 'CUSTO_VIABILIDADE')}
              style={{ flex: 1, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              ← Voltar (Custo)
            </button>
            <button
              onClick={() => cancelar(detalheAberto.id)}
              style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
            >
              Cancelar Pedido
            </button>
          </>
        )}

        {/* Enviado: Finalizar com confirmação + Gerar Link Portal */}
        {etapa === 'ENVIADO' && (
          <>
            {!confirmFinalizar ? (
              <button
                onClick={() => setConfirmFinalizar(true)}
                style={{ flex: 2, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer', minWidth: '120px' }}
              >
                Finalizar
              </button>
            ) : (
              <button
                onClick={async () => {
                  const ok = await salvarDetalhes()
                  if (!ok) { setConfirmFinalizar(false); return }
                  await avancarEtapa(detalheAberto.id, 'FINALIZADO')
                  setConfirmFinalizar(false)
                }}
                style={{ flex: 2, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', minWidth: '120px' }}
              >
                Confirmar Finalização
              </button>
            )}
            <button
              onClick={() => gerarTokenPortal(detalheAberto.id)}
              style={{ flex: 1, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--purple)', backgroundColor: 'transparent', color: 'var(--purple)', cursor: 'pointer' }}
            >
              Gerar Link Portal
            </button>
          </>
        )}

        {/* Normal advance button for other stages */}
        {etapa !== 'APROVACAO' && etapa !== 'ENVIADO' && PROXIMA_ETAPA[etapa] && (
          <button
            onClick={async () => {
              // Save before advancing for stages with editable fields
              if (etapa === 'CUSTO_VIABILIDADE' || etapa === 'CALCULO_FRETE') {
                const ok = await salvarDetalhes()
                if (!ok) return // não avança se save falhou
              }
              await avancarEtapa(detalheAberto.id, PROXIMA_ETAPA[etapa]!,
                etapa === 'CALCULO_FRETE' ? { frete: detalheFrete ? parseFloat(detalheFrete) : null } : undefined
              )
            }}
            style={{ flex: 2, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', minWidth: '160px' }}
          >
            Avançar para {labelEtapa[PROXIMA_ETAPA[etapa]!]}
          </button>
        )}

        {/* Lote 16: Voltar Etapa — disponível em todas as etapas ativas com anterior, exceto APROVACAO (que tem botão próprio) */}
        {etapa !== 'APROVACAO' && ETAPA_ANTERIOR[etapa] && (
          <button
            onClick={() => {
              if (confirm(`Voltar para ${labelEtapa[ETAPA_ANTERIOR[etapa]!]}?`)) {
                avancarEtapa(detalheAberto.id, ETAPA_ANTERIOR[etapa]!)
              }
            }}
            style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            ← {labelEtapa[ETAPA_ANTERIOR[etapa]!]}
          </button>
        )}

        {/* Salvar (for editable stages) */}
        {!['APROVACAO', 'FINALIZADO', 'CANCELADO'].includes(etapa) && (
          <button
            onClick={salvarDetalhes}
            disabled={salvando}
            style={{ flex: 1, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        )}

        {/* Cancelar (for non-terminal stages except APROVACAO which has its own) */}
        {!['FINALIZADO', 'CANCELADO', 'APROVACAO'].includes(etapa) && (
          <button
            onClick={() => cancelar(detalheAberto.id)}
            style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
            Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px', marginTop: '2px' }}>
            {totalAtivos} ativo{totalAtivos !== 1 ? 's' : ''} · {totalFinalizados} finalizado{totalFinalizados !== 1 ? 's' : ''} · {totalCancelados} cancelado{totalCancelados !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          + Nova Solicitação
        </button>
      </div>

      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', backgroundColor: mensagem.startsWith('✓') ? 'var(--green-light)' : 'var(--red-light)', color: mensagem.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
          {mensagem}
        </div>
      )}

      {/* Filtro + Abas terminais */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filtroPrioridade}
          onChange={e => setFiltroPrioridade(e.target.value as PrioridadeTipo | '')}
          style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: filtroPrioridade ? corPrioridade[filtroPrioridade]?.bg : 'var(--bg-surface)', color: filtroPrioridade ? corPrioridade[filtroPrioridade]?.texto : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
        >
          <option value="">Todas prioridades</option>
          <option value="URGENTE">Urgente</option>
          <option value="ALTA">Alta</option>
          <option value="NORMAL">Normal</option>
          <option value="BAIXA">Baixa</option>
        </select>
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)' }} />
        <button
          onClick={() => setAbaTerminal(null)}
          style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: abaTerminal === null ? 600 : 400, border: '1px solid var(--border)', backgroundColor: abaTerminal === null ? 'var(--purple-light)' : 'transparent', color: abaTerminal === null ? 'var(--purple-text)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Fluxo Ativo
        </button>
        {ETAPAS_TERMINAIS.map(e => (
          <button
            key={e}
            onClick={() => setAbaTerminal(abaTerminal === e ? null : e)}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: abaTerminal === e ? 600 : 400, border: '1px solid var(--border)', backgroundColor: abaTerminal === e ? corEtapa[e].header : 'transparent', color: abaTerminal === e ? corEtapa[e].texto : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {labelEtapa[e]} ({soliPorEtapa(e).length})
          </button>
        ))}
      </div>

      {/* Vista de abas terminais */}
      {abaTerminal !== null ? (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          {carregando ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Carregando...</p>
          ) : soliPorEtapa(abaTerminal).length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Nenhuma solicitação {labelEtapa[abaTerminal].toLowerCase()}.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  {['#', 'Cliente', 'Tipo', 'Itens', 'Data', 'Ações'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {soliPorEtapa(abaTerminal).map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < soliPorEtapa(abaTerminal).length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>#{s.numero}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500, color: 'var(--text-primary)' }}>{s.clienteNome}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.tipoPessoa && (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                          {s.tipoPessoa}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>{s.itens.length} item{s.itens.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setDetalheAberto(s)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          Ver
                        </button>
                        {cargo === 'ADMIN' && (
                          <button onClick={() => excluir(s.id)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Kanban — etapas ativas (6 colunas) */
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', alignItems: 'flex-start' }}>
          {ETAPAS_ATIVAS.map(etapa => {
            const cards = soliPorEtapa(etapa)
            const cor = corEtapa[etapa]
            return (
              <div
                key={etapa}
                style={{ minWidth: '210px', flex: '1 1 210px', borderRadius: '10px', border: `1.5px solid ${cor.borda}22`, backgroundColor: 'var(--bg-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {/* Header da coluna */}
                <div style={{ padding: '10px 12px', borderRadius: '8px 8px 0 0', backgroundColor: cor.header, borderBottom: `1.5px solid ${cor.borda}33`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: cor.texto }}>
                    {labelEtapa[etapa]}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: cor.texto, backgroundColor: `${cor.borda}22`, padding: '1px 7px', borderRadius: '10px' }}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {carregando ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '12px 4px', textAlign: 'center' }}>Carregando...</p>
                  ) : cards.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', padding: '12px 4px', textAlign: 'center', fontStyle: 'italic' }}>Vazio</p>
                  ) : cards.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setDetalheAberto(s)}
                      style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', transition: 'box-shadow 0.12s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>#{s.numero}</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {s.prioridade && s.prioridade !== 'NORMAL' && (
                            <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', backgroundColor: corPrioridade[s.prioridade]?.bg ?? 'var(--bg-hover)', color: corPrioridade[s.prioridade]?.texto ?? 'var(--text-secondary)' }}>
                              {labelPrioridade[s.prioridade] ?? s.prioridade}
                            </span>
                          )}
                          {s.tipoPessoa && (
                            <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                              {s.tipoPessoa}
                            </span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>{s.clienteNome}</p>
                      {s.itens.length > 0 && (
                        <>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                            {s.itens.length} item{s.itens.length !== 1 ? 's' : ''}
                            {s.itens.some(it => it.valorUnitario) && (
                              <> · R$ {s.itens.reduce((acc, it) => acc + (it.valorUnitario ?? 0) * it.quantidade, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                            )}
                          </p>
                          {/* Lote 16.1: preview da descrição do primeiro item como referência rápida */}
                          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontStyle: 'italic', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.itens[0].descricao}
                          </p>
                        </>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                          {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        {s.dataEntrega && (
                          <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: new Date(s.dataEntrega) < new Date() ? 'var(--red)' : 'var(--text-secondary)', fontWeight: new Date(s.dataEntrega) < new Date() ? 600 : 400 }}>
                            Entrega: {new Date(s.dataEntrega).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — nova solicitação */}
      {modalAberto && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) { setModalAberto(false) } }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '28px' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Nova Solicitação
            </h2>

            <form onSubmit={criarSolicitacao}>
              {/* Cliente */}
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Cliente
              </p>
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <label style={estiloLabel}>Nome do cliente *</label>
                <input
                  style={estiloInput} value={form.clienteNome} required
                  onChange={e => onChangeNomeCliente(e.target.value)}
                  placeholder="Digite para buscar cliente existente..."
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--purple)'; if (form.clienteNome.length >= 2) { setMostrarSugestoes(true); buscarClientes(form.clienteNome) } }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; setTimeout(() => setMostrarSugestoes(false), 200) }}
                  autoComplete="off"
                />
                {mostrarSugestoes && clientesSugestoes.length > 0 && (
                  <div ref={sugestoesRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                    {clientesSugestoes.map(c => (
                      <button
                        key={c.id} type="button"
                        onMouseDown={e => { e.preventDefault(); selecionarCliente(c) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span style={{ fontWeight: 500 }}>{c.nome}</span>
                        {c.email && <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '8px' }}>{c.email}</span>}
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); setMostrarSugestoes(false); setClientesSugestoes([]) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--purple)', fontWeight: 500 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--purple-light)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      + Novo cliente (preencher manualmente)
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={estiloLabel}>E-mail</label>
                  <input style={estiloInput} type="email" value={form.clienteEmail} onChange={e => setForm(f => ({ ...f, clienteEmail: e.target.value }))} placeholder="email@exemplo.com"
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label style={estiloLabel}>Telefone</label>
                  <input style={estiloInput} value={form.clienteTelefone} onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))} placeholder="(11) 99999-9999"
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={estiloLabel}>Tipo de pessoa</label>
                <select style={estiloInput} value={form.tipoPessoa} onChange={e => setForm(f => ({ ...f, tipoPessoa: e.target.value as '' | 'PF' | 'PJ' }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <option value="">Não informado</option>
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </div>

              {/* Prioridade e Data de Entrega */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <label style={estiloLabel}>Prioridade</label>
                  <select style={estiloInput} value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as PrioridadeTipo }))}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <option value="BAIXA">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
                <div>
                  <label style={estiloLabel}>Data de Entrega (opcional)</label>
                  <input style={estiloInput} type="date" value={form.dataEntrega} onChange={e => setForm(f => ({ ...f, dataEntrega: e.target.value }))}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                </div>
              </div>

              {/* Itens */}
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Itens Solicitados
              </p>
              {itens.map((it, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ flex: 3 }}>
                      <label style={estiloLabel}>Descrição</label>
                      <input style={estiloInput} value={it.descricao} onChange={e => setItem(idx, 'descricao', e.target.value)} placeholder="Ex.: Peça de suporte"
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={estiloLabel}>Qtd.</label>
                      <input style={estiloInput} type="number" min={1} value={it.quantidade} onChange={e => setItem(idx, 'quantidade', parseInt(e.target.value) || 1)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </div>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} style={{ alignSelf: 'flex-end', padding: '8px', borderRadius: '6px', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '12px', marginBottom: '0' }}>
                        ✕
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={estiloLabel}>Referência / Arquivo</label>
                    <input style={estiloInput} value={it.referencia} onChange={e => setItem(idx, 'referencia', e.target.value)} placeholder="Link, descrição de arquivo..."
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} style={{ width: '100%', padding: '7px', borderRadius: '7px', border: '1.5px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', marginBottom: '20px' }}>
                + Adicionar item
              </button>

              {/* Observações */}
              <div style={{ marginBottom: '20px' }}>
                <label style={estiloLabel}>Observações</label>
                <textarea style={{ ...estiloInput, resize: 'vertical', minHeight: '72px' }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais..."
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} style={{ flex: 2, padding: '9px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Criando...' : 'Criar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal — detalhe / edição */}
      {detalheAberto && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setDetalheAberto(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', padding: '28px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <p style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  #{detalheAberto.numero} · {new Date(detalheAberto.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
                  {detalheAberto.clienteNome}
                </h2>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: corEtapa[detalheAberto.etapa].header, color: corEtapa[detalheAberto.etapa].texto }}>
                    {labelEtapa[detalheAberto.etapa]}
                  </span>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: corPrioridade[detalheAberto.prioridade]?.bg ?? 'var(--bg-hover)', color: corPrioridade[detalheAberto.prioridade]?.texto ?? 'var(--text-secondary)' }}>
                    {labelPrioridade[detalheAberto.prioridade] ?? 'Normal'}
                  </span>
                  {/* Lote 16.1: data de entrega editável em todas as etapas */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', backgroundColor: detalheDataEntrega && new Date(detalheDataEntrega + 'T12:00:00') < new Date() ? 'var(--red-light)' : 'var(--amber-light)', color: detalheDataEntrega && new Date(detalheDataEntrega + 'T12:00:00') < new Date() ? 'var(--red)' : 'var(--amber)' }}>
                    Entrega:
                    <input
                      type="date"
                      value={detalheDataEntrega}
                      onChange={e => setDetalheDataEntrega(e.target.value)}
                      style={{ border: 'none', background: 'transparent', color: 'inherit', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, cursor: 'pointer', padding: 0, outline: 'none' }}
                    />
                  </label>
                </div>
              </div>
              <button onClick={() => setDetalheAberto(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>✕</button>
            </div>

            {/* Info do cliente */}
            <div style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)' }}>
              {detalheAberto.clienteEmail && <p style={{ margin: '0 0 4px' }}>✉ {detalheAberto.clienteEmail}</p>}
              {detalheAberto.clienteTelefone && <p style={{ margin: '0 0 4px' }}>☎ {detalheAberto.clienteTelefone}</p>}
              {detalheAberto.tipoPessoa && <p style={{ margin: 0 }}>Tipo: {detalheAberto.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>}
            </div>

            {/* Itens */}
            {detalheItens.length > 0 && renderItensDetalhe()}

            {/* Stage-specific fields */}
            {renderCamposEtapa()}

            {/* Info adicional (Custo e Viabilidade+) */}
            {detalheAberto.etapa !== 'SOLICITACAO' && detalheAberto.etapa !== 'APROVACAO' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={estiloLabel}>Informações adicionais</label>
                <textarea
                  style={{ ...estiloInput, resize: 'vertical', minHeight: '72px' }}
                  value={detalheAberto.infoAdicional ?? ''}
                  onChange={e => setDetalheAberto(d => d ? { ...d, infoAdicional: e.target.value } : d)}
                  placeholder="Custos por item, materiais, observações técnicas..."
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            )}

            {/* Observações */}
            {detalheAberto.etapa !== 'APROVACAO' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={estiloLabel}>Observações</label>
                <textarea
                  style={{ ...estiloInput, resize: 'vertical', minHeight: '60px' }}
                  value={detalheAberto.observacoes ?? ''}
                  onChange={e => setDetalheAberto(d => d ? { ...d, observacoes: e.target.value } : d)}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            )}

            {/* Lote 16.1: erro de upload visível dentro do modal (a mensagem do header fica atrás do overlay) */}
            {uploadErro && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--red-light)', color: 'var(--red)', border: '1px solid var(--red)' }}>
                {uploadErro}
              </div>
            )}

            {/* Arquivos do Pedido — Lote 16: filtra somente arquivos pedido-level (sem item vinculado) */}
            {detalheAberto.pedidoId && (() => {
              const arquivosPedido = arquivos.filter(a => !a.itemWorkspaceId)
              return (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Arquivos gerais do pedido ({arquivosPedido.length})
                  </p>
                  {cargo !== 'VISUALIZADOR' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>máx. 30 MB</span>
                      <label style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', cursor: uploadando ? 'not-allowed' : 'pointer', backgroundColor: 'transparent', opacity: uploadando ? 0.6 : 1 }}>
                        {uploadando ? 'Enviando...' : '+ Upload'}
                        <input type="file" hidden disabled={uploadando} onChange={e => { const f = e.target.files?.[0]; if (f && detalheAberto.pedidoId) uploadArquivo(detalheAberto.pedidoId, f); e.target.value = '' }} />
                      </label>
                    </div>
                  )}
                </div>
                {arquivosPedido.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {arquivosPedido.map(arq => {
                      const isImagem = arq.tipo.startsWith('image/')
                      const isStl = /\.stl$/i.test(arq.nome)
                      const tamanho = arq.tamanhoBytes < 1024 ? `${arq.tamanhoBytes} B` : arq.tamanhoBytes < 1048576 ? `${(arq.tamanhoBytes / 1024).toFixed(1)} KB` : `${(arq.tamanhoBytes / 1048576).toFixed(1)} MB`
                      return (
                        <div key={arq.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontWeight: 500 }}>{arq.nome}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{tamanho}</span>
                          {isImagem && (
                            <button
                              disabled={!!loadingArquivo[arq.id]}
                              onClick={() => previewArquivo(detalheAberto.pedidoId!, arq.id)}
                              style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--border)', backgroundColor: loadingArquivo[arq.id] === 'preview' ? 'var(--purple-light)' : 'transparent', color: 'var(--purple)', cursor: loadingArquivo[arq.id] ? 'wait' : 'pointer', opacity: loadingArquivo[arq.id] && loadingArquivo[arq.id] !== 'preview' ? 0.5 : 1, transition: 'all 0.2s ease' }}
                            >
                              {loadingArquivo[arq.id] === 'preview' ? 'Abrindo...' : 'Preview'}
                            </button>
                          )}
                          {isStl && (
                            <button
                              disabled={!!loadingArquivo[arq.id]}
                              onClick={async () => {
                                setLoadingArquivo(prev => ({ ...prev, [arq.id]: '3d' }))
                                try {
                                  const url = `/api/pedidos/${detalheAberto.pedidoId!}/arquivos/${arq.id}`
                                  const r = await fetch(url)
                                  if (r.ok) { const blob = await r.blob(); setStlPreviewUrl(URL.createObjectURL(blob)) }
                                } finally { setLoadingArquivo(prev => { const n = { ...prev }; delete n[arq.id]; return n }) }
                              }}
                              style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--border)', backgroundColor: loadingArquivo[arq.id] === '3d' ? 'var(--purple-light)' : 'transparent', color: 'var(--purple)', cursor: loadingArquivo[arq.id] ? 'wait' : 'pointer', opacity: loadingArquivo[arq.id] && loadingArquivo[arq.id] !== '3d' ? 0.5 : 1, transition: 'all 0.2s ease' }}
                            >
                              {loadingArquivo[arq.id] === '3d' ? 'Carregando...' : '3D'}
                            </button>
                          )}
                          <button
                            disabled={!!loadingArquivo[arq.id]}
                            onClick={() => downloadArquivo(detalheAberto.pedidoId!, arq.id, arq.nome)}
                            style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--border)', backgroundColor: loadingArquivo[arq.id] === 'baixar' ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-secondary)', cursor: loadingArquivo[arq.id] ? 'wait' : 'pointer', opacity: loadingArquivo[arq.id] && loadingArquivo[arq.id] !== 'baixar' ? 0.5 : 1, transition: 'all 0.2s ease' }}
                          >
                            {loadingArquivo[arq.id] === 'baixar' ? 'Baixando...' : 'Baixar'}
                          </button>
                          {cargo !== 'VISUALIZADOR' && (
                            <button onClick={() => excluirArquivo(detalheAberto.pedidoId!, arq.id)} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {arquivosPedido.length === 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>Nenhum arquivo geral anexado</p>
                )}
              </div>
              )
            })()}

            {/* Preview de imagem */}
            {previewUrl && createPortal(
              <div
                onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'pointer', padding: '24px' }}
              >
                <img src={previewUrl} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }} />
              </div>,
              document.body
            )}

            {/* Preview STL 3D */}
            {stlPreviewUrl && createPortal(
              <StlPreviewDynamic url={stlPreviewUrl} onClose={() => { URL.revokeObjectURL(stlPreviewUrl); setStlPreviewUrl(null) }} />,
              document.body
            )}

            {/* Orçamento/Pedido links */}
            {(detalheAberto.orcamentoId || detalheAberto.pedidoId) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {detalheAberto.orcamentoId && (
                  <>
                    <Link href={`/workspace/orcamentos/${detalheAberto.orcamentoId}`} style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--border)', color: 'var(--purple)', textDecoration: 'none', backgroundColor: 'transparent' }}>
                      Ver Orçamento
                    </Link>
                    <Link href={`/workspace/orcamento/${detalheAberto.orcamentoId}`} style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 500, border: '1px solid var(--purple)', color: '#fff', textDecoration: 'none', backgroundColor: 'var(--purple)' }}>
                      Editar Dados Avançados
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Excluir — somente ADMIN */}
            {cargo === 'ADMIN' && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => excluir(detalheAberto.id)}
                  style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--red-light)', backgroundColor: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                >
                  Excluir Solicitação
                </button>
              </div>
            )}

            {/* Ações */}
            {renderAcoesDetalhe()}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
