'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'

interface ClienteExistente {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  cpfCnpj: string | null
}

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

const CONDICOES_TECNICAS_PADRAO = `– Prazo de entrega: 30 dias.
– O prazo de entrega será confirmado assim que todos os modelos e testes de produção estiverem sido realizados.
– Os produtos acima listados serão fabricados conforme Anexo 1.
– As condições do Anexo 1 não caracterizam defeitos e, portanto, não serão motivo de devolução.`

const CONDICOES_COMERCIAIS_PADRAO = `– A aprovação da proposta deverá ser por e-mail ou através do envio de pedido de compra da contratante, citando seu número.
– Caso não haja valor de frete, considera-se frete FOB.
– Condições de pagamento: 100% a 60 ddl (PIX, Boleto ou Transferência Bancária).
– Após confirmação do pedido o valor do ato não será reembolsado em caso de cancelamento.
– Em caso de cancelamento, a contratante arcará com 50% do valor total do pedido.
– Quaisquer outras exigências (não presentes na proposta) que sejam solicitadas por ocasião do pedido (como alteração na quantidade ou revisão de produtos), deverão ser alvo de novas negociações.
– Cotação válida por 5 dias.`

export default function NovoOrcamentoPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const inputImagemRefs = useRef<(HTMLInputElement | null)[]>([])
  const [clientesExistentes, setClientesExistentes] = useState<ClienteExistente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClientesExistentes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  function preencherCliente(id: string) {
    setClienteSelecionado(id)
    if (!id) {
      setForm(f => ({
        ...f,
        clienteNome: '',
        clienteEmpresa: '',
        clienteCnpj: '',
        clienteEmail: '',
        clienteTelefone: '',
        clienteEndereco: '',
        clienteCep: '',
        clienteResponsavel: '',
        clienteCodInterno: '',
      }))
      setErroEmail('')
      return
    }
    const c = clientesExistentes.find(cl => cl.id === id)
    if (c) {
      setForm(f => ({
        ...f,
        clienteNome: c.nome,
        clienteEmpresa: c.empresa ?? '',
        clienteCnpj: c.cpfCnpj ?? '',
        clienteEmail: c.email ?? '',
        clienteTelefone: c.telefone ?? '',
      }))
    }
  }

  function validarEmail(email: string) {
    if (!email) { setErroEmail(''); return }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setErroEmail(regex.test(email) ? '' : 'Formato de email inválido')
  }

  const [form, setForm] = useState({
    clienteNome: '',
    clienteEmpresa: '',
    clienteCnpj: '',
    clienteEmail: '',
    clienteTelefone: '',
    clienteEndereco: '',
    clienteCep: '',
    clienteResponsavel: '',
    clienteCodInterno: '',
    dataEmissao: new Date().toISOString().slice(0, 10),
    validadeDias: 5,
    orcamentista: '',
    cidade: 'BRASIL – SP – SÃO PAULO',
    frete: '',
    aliquotaImposto: '',
    bonusPercentual: '',
    condicoesTecnicas: CONDICOES_TECNICAS_PADRAO,
    condicoesComerciais: CONDICOES_COMERCIAIS_PADRAO,
    notas: '',
  })

  const [itens, setItens] = useState<Item[]>([itemVazio()])

  function setField(campo: string, valor: string | number) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function setItem(i: number, campo: keyof Item, valor: string | number) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))
  }

  function adicionarItem() {
    setItens(prev => [...prev, itemVazio()])
  }

  function removerItem(i: number) {
    if (itens.length === 1) return
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }

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

  const subtotal = itens.reduce((s, i) => s + (Number(i.valorUnitario) || 0) * (Number(i.quantidade) || 0), 0)
  const freteVal = Number(form.frete) || 0
  const bonusVal = subtotal * ((Number(form.bonusPercentual) || 0) / 100)
  const total = subtotal + freteVal + bonusVal

  async function salvar() {
    if (!form.clienteNome.trim()) { setErro('Informe o nome do cliente.'); return }
    if (form.clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clienteEmail)) { setErro('Formato de email inválido.'); return }
    if (itens.some(i => !i.descricao.trim())) { setErro('Todos os itens precisam de descrição.'); return }
    if (!itens.some(i => i.descricao.trim() && Number(i.valorUnitario) > 0)) { setErro('Ao menos um produto precisa ter valor unitário preenchido.'); return }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          frete:           form.frete ? Number(form.frete) : null,
          aliquotaImposto: form.aliquotaImposto ? Number(form.aliquotaImposto) : null,
          bonusPercentual: form.bonusPercentual ? Number(form.bonusPercentual) : null,
          itens: itens.map((it, idx) => ({ ...it, ordem: idx, valorUnitario: Number(it.valorUnitario) || 0 })),
        }),
      })
      if (res.ok) {
        const orc = await res.json()
        router.push(`/dashboard/orcamentos/${orc.id}`)
      } else {
        const d = await res.json()
        setErro(d.erro ?? 'Erro ao criar orçamento.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '8px 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>←</button>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Novo orçamento</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Preencha os dados para gerar o orçamento.</p>
        </div>
      </div>

      {erro && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', backgroundColor: 'var(--red-light)', color: 'var(--red)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
          {erro}
        </div>
      )}

      {/* Dados do cliente */}
      <div style={estiloCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dados do cliente
          </h2>
        </div>

        {/* Selecionar cliente existente */}
        <div style={{ marginBottom: '20px' }}>
          <label style={estiloLabel}>Selecionar cliente cadastrado</label>
          <select
            style={estiloInput}
            value={clienteSelecionado}
            onChange={e => preencherCliente(e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <option value="">Preencher manualmente</option>
            {clientesExistentes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.empresa ? ` (${c.empresa})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={estiloGrade2}>
          <div>
            <label style={estiloLabel}>Nome / Responsável *</label>
            <input style={estiloInput} value={form.clienteNome} onChange={e => setField('clienteNome', e.target.value)}
              placeholder="Nome completo do cliente"
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Empresa</label>
            <input style={estiloInput} value={form.clienteEmpresa} onChange={e => setField('clienteEmpresa', e.target.value)}
              placeholder="Razão social"
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        <div style={estiloGrade3}>
          <div>
            <label style={estiloLabel}>CNPJ</label>
            <input style={estiloInput} value={form.clienteCnpj} onChange={e => setField('clienteCnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>CEP</label>
            <input style={estiloInput} value={form.clienteCep} onChange={e => setField('clienteCep', e.target.value)}
              placeholder="00000-000"
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Telefone</label>
            <input style={estiloInput} value={form.clienteTelefone} onChange={e => setField('clienteTelefone', e.target.value)}
              placeholder="(11) 99999-0000"
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Endereço</label>
          <input style={estiloInput} value={form.clienteEndereco} onChange={e => setField('clienteEndereco', e.target.value)}
            placeholder="Rua, número, bairro"
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <div style={estiloGrade2}>
          <div>
            <label style={estiloLabel}>E-mail</label>
            <input style={estiloInput} type="email" value={form.clienteEmail}
              onChange={e => { setField('clienteEmail', e.target.value); validarEmail(e.target.value) }}
              placeholder="email@exemplo.com"
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
            {erroEmail && <p style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erroEmail}</p>}
          </div>
          <div>
            <label style={estiloLabel}>Responsável pelo contato</label>
            <input style={estiloInput} value={form.clienteResponsavel} onChange={e => setField('clienteResponsavel', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        <div style={estiloGrade3}>
          <div>
            <label style={estiloLabel}>Código interno (cliente)</label>
            <input style={estiloInput} value={form.clienteCodInterno} onChange={e => setField('clienteCodInterno', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Data de emissão</label>
            <input style={estiloInput} type="date" value={form.dataEmissao} onChange={e => setField('dataEmissao', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Orçamentista</label>
            <input style={estiloInput} value={form.orcamentista} onChange={e => setField('orcamentista', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        <div style={estiloGrade2}>
          <div>
            <label style={estiloLabel}>Cidade / Localização</label>
            <input style={estiloInput} value={form.cidade} onChange={e => setField('cidade', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Validade (dias)</label>
            <input style={estiloInput} type="number" min={1} value={form.validadeDias} onChange={e => setField('validadeDias', Number(e.target.value))}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
      </div>

      {/* Itens do orçamento */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Produtos / Serviços
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--purple)', borderRadius: '8px' }}>
                {['#', 'Descrição do produto', 'Qtd', 'Valor / UN', 'Total', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: h === 'Total' || h === '' ? 'right' : 'left',
                    fontSize: '12px', fontWeight: 700, color: '#fff',
                    fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => {
                const totalItem = (Number(item.valorUnitario) || 0) * (Number(item.quantidade) || 0)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', width: '36px' }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        placeholder="Descrição"
                        style={{ ...estiloInput, marginBottom: '6px' }}
                        value={item.descricao}
                        onChange={e => setItem(i, 'descricao', e.target.value)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      />
                      <textarea
                        placeholder="Detalhamento (Anexo 1 — opcional)"
                        style={{ ...estiloInput, resize: 'vertical', minHeight: '56px', fontSize: '12px', marginBottom: '8px' }}
                        value={item.detalhamento}
                        onChange={e => setItem(i, 'detalhamento', e.target.value)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      />
                      {/* Imagens do item */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {item.imagensBase64.map((b64, j) => (
                          <div key={j} style={{ position: 'relative' }}>
                            <img src={b64} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                            <button
                              type="button"
                              onClick={() => removerImagem(i, j)}
                              style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', backgroundColor: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >×</button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => inputImagemRefs.current[i]?.click()}
                          style={{ width: 56, height: 56, borderRadius: '6px', border: '1px dashed var(--border)', backgroundColor: 'var(--bg-page)', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Adicionar imagem"
                        >+</button>
                        <input
                          ref={el => { inputImagemRefs.current[i] = el }}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) adicionarImagem(i, f); e.target.value = '' }}
                        />
                        {item.imagensBase64.length === 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Sem imagens</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', width: '70px' }}>
                      <input type="number" min={1} style={{ ...estiloInput, textAlign: 'center' }}
                        value={item.quantidade}
                        onChange={e => setItem(i, 'quantidade', Number(e.target.value))}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </td>
                    <td style={{ padding: '8px 12px', width: '120px' }}>
                      <input type="number" min={0} step={0.01} style={{ ...estiloInput, textAlign: 'right' }}
                        value={item.valorUnitario}
                        onChange={e => setItem(i, 'valorUnitario', e.target.value)}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', width: '100px', whiteSpace: 'nowrap' }}>
                      {totalItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td style={{ padding: '8px 12px', width: '32px' }}>
                      {itens.length > 1 && (
                        <button onClick={() => removerItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '16px' }}>×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={adicionarItem}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
            fontFamily: 'Inter, sans-serif', cursor: 'pointer', fontWeight: 500,
            backgroundColor: 'transparent', color: 'var(--purple)',
            border: '1px solid var(--purple-light)',
          }}
        >
          + Adicionar item
        </button>
      </div>

      {/* Outras despesas */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Outras despesas
        </h2>
        <div style={estiloGrade3}>
          <div>
            <label style={estiloLabel}>Frete e manuseio (R$)</label>
            <input type="number" min={0} step={0.01} style={estiloInput} placeholder="0,00"
              value={form.frete} onChange={e => setField('frete', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Alíquota de imposto (%)</label>
            <input type="number" min={0} step={0.01} style={estiloInput} placeholder="0,00"
              value={form.aliquotaImposto} onChange={e => setField('aliquotaImposto', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label style={estiloLabel}>Bônus sobre vendas (%)</label>
            <input type="number" min={0} step={0.01} style={estiloInput} placeholder="0,00"
              value={form.bonusPercentual} onChange={e => setField('bonusPercentual', e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          </div>
        </div>
        {/* Resumo de totais */}
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {[
            { label: 'Subtotal do pedido', valor: subtotal },
            { label: `Frete e manuseio`, valor: freteVal },
            { label: `Bônus (${form.bonusPercentual || 0}%)`, valor: bonusVal },
          ].map(({ label, valor }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
              <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid var(--border-strong)' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif' }}>Total do pedido</span>
            <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--purple)' }}>
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
      </div>

      {/* Condições */}
      <div style={estiloCard}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Condições e observações
        </h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Condições técnicas</label>
          <textarea style={{ ...estiloInput, minHeight: '100px', resize: 'vertical' }}
            value={form.condicoesTecnicas} onChange={e => setField('condicoesTecnicas', e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={estiloLabel}>Condições comerciais</label>
          <textarea style={{ ...estiloInput, minHeight: '130px', resize: 'vertical' }}
            value={form.condicoesComerciais} onChange={e => setField('condicoesComerciais', e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={estiloLabel}>Notas</label>
          <textarea style={{ ...estiloInput, minHeight: '60px', resize: 'vertical' }}
            value={form.notas} onChange={e => setField('notas', e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '10px 20px', borderRadius: '8px', fontSize: '14px',
            fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            backgroundColor: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            padding: '10px 24px', borderRadius: '8px', fontSize: '14px',
            fontFamily: 'Inter, sans-serif', cursor: salvando ? 'not-allowed' : 'pointer',
            fontWeight: 600, backgroundColor: 'var(--purple)', color: '#fff',
            border: 'none', opacity: salvando ? 0.7 : 1,
          }}
        >
          {salvando ? 'Salvando...' : 'Criar orçamento'}
        </button>
      </div>
    </div>
  )
}
