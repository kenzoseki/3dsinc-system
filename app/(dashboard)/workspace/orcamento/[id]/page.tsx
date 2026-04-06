'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface Item {
  ordem: number
  descricao: string
  detalhamento: string
  quantidade: number
  valorUnitario: number
  imagensBase64: string[]
}

const itemVazio = (): Item => ({ ordem: 0, descricao: '', detalhamento: '', quantidade: 1, valorUnitario: 0, imagensBase64: [] })

const estiloLabel: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: '5px', fontFamily: 'Inter, sans-serif',
  textTransform: 'uppercase', letterSpacing: '0.3px',
}
const estiloInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)',
  fontSize: '14px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)',
}
const estiloCard: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: '12px', padding: '28px 32px', marginBottom: '20px',
}
const estiloGrade2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }
const estiloGrade3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }

export default function EditarOrcamentoWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const inputImagemRefs = useRef<(HTMLInputElement | null)[]>([])

  const [form, setForm] = useState({
    numero: 0,
    revisao: 0,
    clienteNome: '',
    clienteEmpresa: '',
    clienteCnpj: '',
    clienteEmail: '',
    clienteTelefone: '',
    clienteEndereco: '',
    clienteCep: '',
    clienteResponsavel: '',
    clienteCodInterno: '',
    dataEmissao: '',
    validadeDias: 5,
    orcamentista: '',
    cidade: '',
    frete: '',
    aliquotaImposto: '',
    bonusPercentual: '',
    condicoesTecnicas: '',
    condicoesComerciais: '',
    notas: '',
  })

  const [itens, setItens] = useState<Item[]>([itemVazio()])

  useEffect(() => {
    if (!id) return
    fetch(`/api/orcamentos/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(orc => {
        if (!orc) { setErro('Orçamento não encontrado'); setCarregando(false); return }
        setForm({
          numero: orc.numero ?? 0,
          revisao: orc.revisao ?? 0,
          clienteNome: orc.clienteNome ?? '',
          clienteEmpresa: orc.clienteEmpresa ?? '',
          clienteCnpj: orc.clienteCnpj ?? '',
          clienteEmail: orc.clienteEmail ?? '',
          clienteTelefone: orc.clienteTelefone ?? '',
          clienteEndereco: orc.clienteEndereco ?? '',
          clienteCep: orc.clienteCep ?? '',
          clienteResponsavel: orc.clienteResponsavel ?? '',
          clienteCodInterno: orc.clienteCodInterno ?? '',
          dataEmissao: orc.dataEmissao ? new Date(orc.dataEmissao).toISOString().slice(0, 10) : '',
          validadeDias: orc.validadeDias ?? 5,
          orcamentista: orc.orcamentista ?? '',
          cidade: orc.cidade ?? '',
          frete: orc.frete != null ? String(orc.frete) : '',
          aliquotaImposto: orc.aliquotaImposto != null ? String(orc.aliquotaImposto) : '',
          bonusPercentual: orc.bonusPercentual != null ? String(orc.bonusPercentual) : '',
          condicoesTecnicas: orc.condicoesTecnicas ?? '',
          condicoesComerciais: orc.condicoesComerciais ?? '',
          notas: orc.notas ?? '',
        })
        if (orc.itens && orc.itens.length > 0) {
          setItens(orc.itens.map((it: any) => ({
            ordem: it.ordem ?? 0,
            descricao: it.descricao ?? '',
            detalhamento: it.detalhamento ?? '',
            quantidade: it.quantidade ?? 1,
            valorUnitario: Number(it.valorUnitario ?? 0),
            imagensBase64: (it.imagens ?? []).map((img: any) => img.imagemBase64),
          })))
        }
        setCarregando(false)
      })
      .catch(() => { setErro('Erro ao carregar orçamento'); setCarregando(false) })
  }, [id])

  function setField(campo: string, valor: string | number) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function setItem(i: number, campo: keyof Item, valor: string | number) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))
  }

  function adicionarItem() { setItens(prev => [...prev, itemVazio()]) }
  function removerItem(i: number) { if (itens.length > 1) setItens(prev => prev.filter((_, idx) => idx !== i)) }

  function adicionarImagem(itemIdx: number, file: File) {
    if (file.size > 2 * 1024 * 1024) { alert('Imagem muito grande. Máximo 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setItens(prev => prev.map((it, idx) =>
        idx === itemIdx ? { ...it, imagensBase64: [...it.imagensBase64, reader.result as string] } : it
      ))
    }
    reader.readAsDataURL(file)
  }

  function removerImagem(itemIdx: number, imgIdx: number) {
    setItens(prev => prev.map((it, idx) =>
      idx === itemIdx ? { ...it, imagensBase64: it.imagensBase64.filter((_, j) => j !== imgIdx) } : it
    ))
  }

  const subtotal = itens.reduce((s, it) => s + it.valorUnitario * it.quantidade, 0)
  const freteNum = parseFloat(form.frete) || 0
  const impostoNum = parseFloat(form.aliquotaImposto) || 0
  const bonusNum = parseFloat(form.bonusPercentual) || 0
  const total = subtotal + freteNum + subtotal * (impostoNum / 100) + subtotal * (bonusNum / 100)
  const orcLabel = `ORC-${String(form.numero).padStart(4, '0')}-${String(form.revisao).padStart(2, '0')}`

  async function salvar() {
    if (!form.clienteNome.trim()) { setErro('Nome do cliente é obrigatório'); return }
    const itensValidos = itens.filter(it => it.descricao.trim())
    if (itensValidos.length === 0) { setErro('Adicione ao menos 1 item com descrição'); return }
    setSalvando(true)
    setErro('')
    try {
      const r = await fetch(`/api/orcamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: form.numero,
          revisao: form.revisao,
          clienteNome: form.clienteNome.trim(),
          clienteEmpresa: form.clienteEmpresa || null,
          clienteCnpj: form.clienteCnpj || null,
          clienteEmail: form.clienteEmail || null,
          clienteTelefone: form.clienteTelefone || null,
          clienteEndereco: form.clienteEndereco || null,
          clienteCep: form.clienteCep || null,
          clienteResponsavel: form.clienteResponsavel || null,
          clienteCodInterno: form.clienteCodInterno || null,
          dataEmissao: form.dataEmissao || null,
          validadeDias: form.validadeDias,
          orcamentista: form.orcamentista || null,
          cidade: form.cidade || null,
          frete: freteNum || null,
          aliquotaImposto: impostoNum || null,
          bonusPercentual: bonusNum || null,
          condicoesTecnicas: form.condicoesTecnicas || null,
          condicoesComerciais: form.condicoesComerciais || null,
          notas: form.notas || null,
          itens: itensValidos.map((it, i) => ({
            ordem: i,
            descricao: it.descricao.trim(),
            detalhamento: it.detalhamento || null,
            quantidade: it.quantidade,
            valorUnitario: it.valorUnitario,
            imagensBase64: it.imagensBase64,
          })),
        }),
      })
      if (r.ok) {
        setMensagem('Orçamento salvo com sucesso')
        setTimeout(() => router.push('/workspace'), 1200)
      } else {
        const dados = await r.json()
        setErro(dados.erro ?? 'Erro ao salvar orçamento')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Carregando orçamento...</div>
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/workspace')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', padding: '4px' }}>
          ←
        </button>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
            Editar Orçamento
          </h1>
          <p style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--purple)', margin: '2px 0 0' }}>
            {orcLabel}
          </p>
        </div>
      </div>

      {erro && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--red-light)', color: 'var(--red)' }}>
          {erro}
        </div>
      )}
      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--green-light)', color: 'var(--green)' }}>
          {mensagem}
        </div>
      )}

      {/* Numeração */}
      <div style={estiloCard}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Numeração
        </p>
        <div style={estiloGrade2}>
          <div>
            <label style={estiloLabel}>Orçamento Nº</label>
            <input style={estiloInput} type="number" min={0} value={form.numero} onChange={e => setField('numero', parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label style={estiloLabel}>Revisão</label>
            <input style={estiloInput} type="number" min={0} value={form.revisao} onChange={e => setField('revisao', parseInt(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div style={estiloCard}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Dados do Cliente
        </p>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Nome *</label>
          <input style={estiloInput} value={form.clienteNome} onChange={e => setField('clienteNome', e.target.value)} />
        </div>
        <div style={estiloGrade2}>
          <div><label style={estiloLabel}>Empresa</label><input style={estiloInput} value={form.clienteEmpresa} onChange={e => setField('clienteEmpresa', e.target.value)} /></div>
          <div><label style={estiloLabel}>CNPJ/CPF</label><input style={estiloInput} value={form.clienteCnpj} onChange={e => setField('clienteCnpj', e.target.value)} /></div>
        </div>
        <div style={estiloGrade2}>
          <div><label style={estiloLabel}>Email</label><input style={estiloInput} type="email" value={form.clienteEmail} onChange={e => setField('clienteEmail', e.target.value)} /></div>
          <div><label style={estiloLabel}>Telefone</label><input style={estiloInput} value={form.clienteTelefone} onChange={e => setField('clienteTelefone', e.target.value)} /></div>
        </div>
        <div style={estiloGrade2}>
          <div><label style={estiloLabel}>Endereço</label><input style={estiloInput} value={form.clienteEndereco} onChange={e => setField('clienteEndereco', e.target.value)} /></div>
          <div><label style={estiloLabel}>CEP</label><input style={estiloInput} value={form.clienteCep} onChange={e => setField('clienteCep', e.target.value)} /></div>
        </div>
        <div style={estiloGrade2}>
          <div><label style={estiloLabel}>Responsável</label><input style={estiloInput} value={form.clienteResponsavel} onChange={e => setField('clienteResponsavel', e.target.value)} /></div>
          <div><label style={estiloLabel}>Código Interno</label><input style={estiloInput} value={form.clienteCodInterno} onChange={e => setField('clienteCodInterno', e.target.value)} /></div>
        </div>
      </div>

      {/* Metadados */}
      <div style={estiloCard}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Metadados
        </p>
        <div style={estiloGrade3}>
          <div><label style={estiloLabel}>Data de Emissão</label><input style={estiloInput} type="date" value={form.dataEmissao} onChange={e => setField('dataEmissao', e.target.value)} /></div>
          <div><label style={estiloLabel}>Validade (dias)</label><input style={estiloInput} type="number" min={1} value={form.validadeDias} onChange={e => setField('validadeDias', parseInt(e.target.value) || 5)} /></div>
          <div><label style={estiloLabel}>Orçamentista</label><input style={estiloInput} value={form.orcamentista} onChange={e => setField('orcamentista', e.target.value)} /></div>
        </div>
        <div><label style={estiloLabel}>Cidade</label><input style={estiloInput} value={form.cidade} onChange={e => setField('cidade', e.target.value)} /></div>
      </div>

      {/* Itens */}
      <div style={estiloCard}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Itens do Orçamento
        </p>
        {itens.map((it, i) => (
          <div key={i} style={{ backgroundColor: 'var(--bg-page)', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Item {i + 1}</span>
              {itens.length > 1 && (
                <button onClick={() => removerItem(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              )}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={estiloLabel}>Descrição *</label>
              <input style={estiloInput} value={it.descricao} onChange={e => setItem(i, 'descricao', e.target.value)} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={estiloLabel}>Detalhamento</label>
              <textarea style={{ ...estiloInput, resize: 'vertical', minHeight: '60px' }} value={it.detalhamento} onChange={e => setItem(i, 'detalhamento', e.target.value)} />
            </div>
            <div style={estiloGrade2}>
              <div>
                <label style={estiloLabel}>Quantidade</label>
                <input style={estiloInput} type="number" min={1} value={it.quantidade} onChange={e => setItem(i, 'quantidade', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label style={estiloLabel}>Valor Unitário (R$)</label>
                <input style={estiloInput} type="number" step="0.01" min={0} value={it.valorUnitario || ''} onChange={e => setItem(i, 'valorUnitario', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <p style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', margin: '4px 0 8px' }}>
              Subtotal: R$ {(it.valorUnitario * it.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            {/* Imagens */}
            <div>
              <label style={estiloLabel}>Imagens</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {it.imagensBase64.map((img, j) => (
                  <div key={j} style={{ position: 'relative', width: '64px', height: '64px' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    <button onClick={() => removerImagem(i, j)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--red)', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                ))}
              </div>
              <input
                ref={el => { inputImagemRefs.current[i] = el }}
                type="file" accept="image/*" hidden
                onChange={e => { if (e.target.files?.[0]) adicionarImagem(i, e.target.files[0]); e.target.value = '' }}
              />
              <button onClick={() => inputImagemRefs.current[i]?.click()} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', border: '1px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                + Imagem
              </button>
            </div>
          </div>
        ))}
        <button onClick={adicionarItem} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
          + Adicionar Item
        </button>
      </div>

      {/* Financeiro */}
      <div style={estiloCard}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Financeiro
        </p>
        <div style={estiloGrade3}>
          <div><label style={estiloLabel}>Frete (R$)</label><input style={estiloInput} type="number" step="0.01" value={form.frete} onChange={e => setField('frete', e.target.value)} /></div>
          <div><label style={estiloLabel}>Alíquota Imposto (%)</label><input style={estiloInput} type="number" step="0.01" value={form.aliquotaImposto} onChange={e => setField('aliquotaImposto', e.target.value)} /></div>
          <div><label style={estiloLabel}>Bônus (%)</label><input style={estiloInput} type="number" step="0.01" value={form.bonusPercentual} onChange={e => setField('bonusPercentual', e.target.value)} /></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '8px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: '0 0 4px' }}>Subtotal: R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Condições */}
      <div style={estiloCard}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Condições e Observações
        </p>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Condições Técnicas</label>
          <textarea style={{ ...estiloInput, resize: 'vertical', minHeight: '100px' }} value={form.condicoesTecnicas} onChange={e => setField('condicoesTecnicas', e.target.value)} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Condições Comerciais</label>
          <textarea style={{ ...estiloInput, resize: 'vertical', minHeight: '100px' }} value={form.condicoesComerciais} onChange={e => setField('condicoesComerciais', e.target.value)} />
        </div>
        <div>
          <label style={estiloLabel}>Notas</label>
          <textarea style={{ ...estiloInput, resize: 'vertical', minHeight: '72px' }} value={form.notas} onChange={e => setField('notas', e.target.value)} />
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
        <button onClick={() => router.push('/workspace')} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          Voltar ao Workspace
        </button>
        <button onClick={salvar} disabled={salvando} style={{ flex: 2, padding: '12px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Nunito, sans-serif', fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff', border: 'none', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
          {salvando ? 'Salvando...' : 'Salvar Orçamento'}
        </button>
      </div>
    </div>
  )
}
