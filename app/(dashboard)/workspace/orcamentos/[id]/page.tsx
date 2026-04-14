'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ImagemItem {
  id: string
  imagemBase64: string
  nomeArquivo: string
}

interface Item {
  id: string
  ordem: number
  descricao: string
  detalhamento: string | null
  quantidade: number
  valorUnitario: number
  imagens: ImagemItem[]
}

interface Orcamento {
  id: string
  numero: number
  revisao: number
  clienteNome: string
  clienteEmpresa: string | null
  clienteCnpj: string | null
  clienteEmail: string | null
  clienteTelefone: string | null
  clienteEndereco: string | null
  clienteCep: string | null
  clienteResponsavel: string | null
  clienteCodInterno: string | null
  dataEmissao: string
  validadeDias: number
  orcamentista: string | null
  cidade: string | null
  condicoesTecnicas: string | null
  condicoesComerciais: string | null
  notas: string | null
  frete: number | null
  aliquotaImposto: number | null
  bonusPercentual: number | null
  status: string
  itens: Item[]
}

interface ConfigEmpresa {
  nomeEmpresa: string
  logoBase64: string | null
  cnpj: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
}

const labelStatus: Record<string, { label: string; bg: string; cor: string }> = {
  RASCUNHO:  { label: 'Rascunho',  bg: '#F3F2EF', cor: '#6B6860' },
  ENVIADO:   { label: 'Andamento', bg: 'var(--amber-light)', cor: 'var(--amber)' },
  APROVADO:  { label: 'Aprovado',  bg: 'var(--green-light)', cor: 'var(--green)' },
  REPROVADO: { label: 'Reprovado', bg: 'var(--red-light)', cor: 'var(--red)' },
}

export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [orc, setOrc] = useState<Orcamento | null>(null)
  const [config, setConfig] = useState<ConfigEmpresa | null>(null)
  const [alterandoStatus, setAlterandoStatus] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/orcamentos/${id}`).then(r => r.json()),
      fetch('/api/configuracoes').then(r => r.json()),
    ]).then(([o, c]) => { setOrc(o); setConfig(c) })
  }, [id])

  async function alterarStatus(novoStatus: string) {
    if (novoStatus === 'ENVIADO' && orc) {
      if (!orc.clienteNome.trim()) { alert('O orçamento precisa ter o nome do cliente preenchido.'); return }
      if (!orc.itens.some(i => i.descricao.trim() && Number(i.valorUnitario) > 0)) {
        alert('O orçamento precisa ter ao menos um produto com valor unitário.'); return
      }
    }
    setAlterandoStatus(true)
    const res = await fetch(`/api/orcamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    if (res.ok) setOrc(await res.json())
    setAlterandoStatus(false)
  }

  async function excluir() {
    if (!confirm('Confirmar exclusão do orçamento?')) return
    try {
      const r = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' })
      if (!r.ok) { alert('Erro ao excluir orçamento'); return }
      router.push('/workspace/orcamentos')
    } catch { alert('Erro de conexão ao excluir') }
  }

  function imprimirPDF() {
    document.body.classList.add('print-isolated')
    const cleanup = () => {
      document.body.classList.remove('print-isolated')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
    setTimeout(() => { if (document.body.classList.contains('print-isolated')) cleanup() }, 1000)
  }

  if (!orc || !config || !orc.itens) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Carregando...</div>
  }

  const subtotal = orc.itens.reduce((s, i) => s + Number(i.valorUnitario) * i.quantidade, 0)
  const freteVal = Number(orc.frete ?? 0)
  const bonusVal = subtotal * (Number(orc.bonusPercentual ?? 0) / 100)
  const impostoVal = subtotal * (Number(orc.aliquotaImposto ?? 0) / 100)
  const total = subtotal + freteVal + bonusVal
  const st = labelStatus[orc.status] ?? labelStatus.RASCUNHO
  const itensCom = orc.itens.filter(i => i.detalhamento)
  const itensComImagens = orc.itens.filter(i => i.imagens && i.imagens.length > 0)

  const estiloTh: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: '12px',
    fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif',
    backgroundColor: '#5B47C8',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  }

  return (
    <>
      {/* Barra de ações — só visível na tela, some no print */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', maxWidth: '820px', margin: '0 auto 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>←</button>
          <div>
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ORC-{String(orc.numero).padStart(4, '0')}-{String(orc.revisao).padStart(2, '0')}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif',
                backgroundColor: st.bg, color: st.cor,
              }}>{st.label}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={orc.status}
            onChange={e => alterarStatus(e.target.value)}
            disabled={alterandoStatus}
            style={{
              padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
              fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            {Object.entries(labelStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button
            onClick={imprimirPDF}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              backgroundColor: 'var(--purple)', color: '#fff', border: 'none',
            }}
          >
            Imprimir / PDF
          </button>
          <button
            onClick={excluir}
            style={{
              padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              backgroundColor: 'transparent', color: 'var(--red)', border: '1px solid var(--red-light)',
            }}
          >
            Excluir
          </button>
        </div>
      </div>

      {/* DOCUMENTO DO ORÇAMENTO — aparece na tela e no print */}
      <div id="orcamento-doc" style={{
        maxWidth: '820px', margin: '0 auto', backgroundColor: '#fff',
        padding: '40px', fontFamily: 'Arial, sans-serif',
        border: '1px solid var(--border)', borderRadius: '8px',
      }}>
        {/* Cabeçalho */}
        <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle', paddingRight: '20px' }}>
                {config.logoBase64 ? (
                  <img src={config.logoBase64} alt="Logo" style={{ maxHeight: '60px', maxWidth: '160px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#2C2A26', letterSpacing: '-1px' }}>
                    {config.nomeEmpresa.toUpperCase()}
                  </div>
                )}
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#2C2A26', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  ORÇAMENTO: {String(orc.numero).padStart(4, '0')}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2C2A26', marginTop: '4px', letterSpacing: '1px' }}>
                  REVISÃO: {String(orc.revisao).padStart(2, '0')}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ border: 'none', borderTop: '2px solid #2C2A26', marginBottom: '16px' }} />

        {/* Dados do cliente */}
        <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', width: '60%', paddingRight: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>DADOS DO CLIENTE:</div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>
                  {orc.clienteNome.toUpperCase()}{orc.clienteCodInterno ? ` (CÓDIGO INTERNO: ${orc.clienteCodInterno})` : ''}
                </div>
                {orc.clienteCnpj && <div style={{ fontSize: '11px' }}>CNPJ: {orc.clienteCnpj}</div>}
                {orc.clienteCep && orc.clienteEndereco && <div style={{ fontSize: '11px' }}>CEP: {orc.clienteCep} — {orc.clienteEndereco}</div>}
                {orc.clienteTelefone && <div style={{ fontSize: '11px' }}>TELEFONE: {orc.clienteTelefone}</div>}
                {orc.clienteEmail && <div style={{ fontSize: '11px' }}>E-MAIL: {orc.clienteEmail}</div>}
                {orc.clienteResponsavel && <div style={{ fontSize: '11px' }}>RESPONSÁVEL: {orc.clienteResponsavel}</div>}
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '11px' }}>
                <div>{new Date(orc.dataEmissao).toLocaleDateString('pt-BR')}</div>
                <div>{orc.cidade ?? ''}</div>
                {orc.orcamentista && <div>ORÇAMENTISTA: {orc.orcamentista}</div>}
                {config.email && <div>{config.email}</div>}
                {config.telefone && <div>{config.telefone}</div>}
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ border: 'none', borderTop: '1px solid #ccc', marginBottom: '16px' }} />

        {/* Tabela de produtos */}
        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>DETALHAMENTO DO ORÇAMENTO</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ ...estiloTh, width: '40px' }}>PRODUTOS</th>
              <th style={{ ...estiloTh }}></th>
              <th style={{ ...estiloTh, textAlign: 'center', width: '50px' }}>QTD</th>
              <th style={{ ...estiloTh, textAlign: 'right', width: '100px' }}>VALOR / UN</th>
              <th style={{ ...estiloTh, textAlign: 'right', width: '100px' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {orc.itens.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e8e6e0' }}>
                <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#6B6860' }}>{String(i + 1).padStart(2, '0')}</td>
                <td style={{ padding: '8px 12px', fontSize: '11px' }}>{item.descricao.toUpperCase()}</td>
                <td style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'center' }}>{item.quantidade}</td>
                <td style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>
                  R${Number(item.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>
                  R${(Number(item.valorUnitario) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {[...Array(Math.max(0, 3 - orc.itens.length))].map((_, i) => (
              <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #e8e6e0' }}>
                <td style={{ padding: '8px 12px', fontSize: '11px', color: '#ccc' }}>{String(orc.itens.length + i + 1).padStart(2, '0')}</td>
                <td style={{ padding: '8px 12px', fontSize: '11px', color: '#ccc' }}>–</td>
                <td /><td /><td />
              </tr>
            ))}
            <tr style={{ backgroundColor: '#5B47C8', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <td colSpan={4} style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>SUBTOTAL DO PEDIDO</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#fff', textAlign: 'right' }}>
                R${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Outras despesas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ ...estiloTh }}>OUTRAS DESPESAS</th>
              <th style={{ ...estiloTh }}></th>
              <th style={{ ...estiloTh, textAlign: 'right', width: '100px' }}>VALOR / UN</th>
              <th style={{ ...estiloTh, textAlign: 'right', width: '100px' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Frete e Manuseio', perc: null, valor: freteVal },
              { label: 'Alíquota de Imposto', perc: orc.aliquotaImposto ? `${orc.aliquotaImposto}%` : null, valor: impostoVal },
              { label: 'Imposto Sobre Vendas', perc: null, valor: 0 },
              { label: 'Bônus Sobre Vendas', perc: orc.bonusPercentual ? `${orc.bonusPercentual}%` : null, valor: bonusVal },
            ].map(({ label, perc, valor }) => (
              <tr key={label} style={{ borderBottom: '1px solid #e8e6e0' }}>
                <td style={{ padding: '7px 12px', fontSize: '11px' }}>{label}</td>
                <td style={{ padding: '7px 12px', fontSize: '11px', color: '#6B6860' }}>{perc ?? ''}</td>
                <td style={{ padding: '7px 12px', fontSize: '11px', textAlign: 'right' }}>
                  R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '7px 12px', fontSize: '11px', textAlign: 'right' }}>
                  R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#5B47C8', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <td colSpan={3} style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>SUBTOTAL DAS DESPESAS</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#fff', textAlign: 'right' }}>
                R$ {(freteVal + bonusVal + impostoVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Condições técnicas */}
        {orc.condicoesTecnicas && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#5B47C8', padding: '8px 12px', marginBottom: '8px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>CONDIÇÕES TÉCNICAS</span>
            </div>
            <div style={{ padding: '0 4px' }}>
              {orc.condicoesTecnicas.split('\n').map((linha, i) => (
                <p key={i} style={{ fontSize: '11px', marginBottom: '4px' }}>{linha}</p>
              ))}
            </div>
          </div>
        )}

        {/* Condições comerciais */}
        {orc.condicoesComerciais && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#5B47C8', padding: '8px 12px', marginBottom: '8px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>CONDIÇÕES COMERCIAIS</span>
            </div>
            <div style={{ padding: '0 4px' }}>
              {orc.condicoesComerciais.split('\n').map((linha, i) => (
                <p key={i} style={{ fontSize: '11px', marginBottom: '4px' }}>{linha}</p>
              ))}
            </div>
          </div>
        )}

        {/* Notas + Total */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #2C2A26' }}>
          <tbody>
            <tr>
              <td style={{ padding: '16px 12px', verticalAlign: 'top', width: '60%', borderRight: '2px solid #2C2A26' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>NOTAS:</div>
                {orc.notas ? (
                  orc.notas.split('\n').map((linha, i) => <p key={i} style={{ fontSize: '11px' }}>{linha}</p>)
                ) : (
                  <p style={{ fontSize: '11px', color: '#ccc' }}>—</p>
                )}
              </td>
              <td style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>TOTAL DO PEDIDO</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#2C2A26' }}>
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Página 2 — Anexo 1 (itens com detalhamento) */}
        {itensCom.length > 0 && (
          <div style={{ marginTop: '48px', pageBreakBefore: 'always' }}>
            <hr style={{ border: 'none', borderTop: '2px solid #2C2A26', marginBottom: '16px' }} />
            <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.5px' }}>ANEXO 1 - DETALHAMENTO DOS PRODUTOS</div>
            {itensCom.map((item, i) => (
              <div key={item.id} style={{ marginBottom: '24px', border: '2px solid #5B47C8', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#5B47C8', padding: '10px 16px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    {String(i + 1).padStart(2, '0')} &nbsp;&nbsp; {item.descricao.toUpperCase()}
                  </span>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  {item.detalhamento?.split('\n').map((linha, j) => (
                    <p key={j} style={{ fontSize: '11px', marginBottom: '4px' }}>{linha}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé da página */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #e8e6e0', paddingTop: '8px', textAlign: 'right' }}>
          <span style={{ fontSize: '10px', color: '#aaa' }}>1</span>
        </div>

        {/* Anexo de Imagens — última(s) página(s) do PDF */}
        {itensComImagens.length > 0 && (
          <div style={{ marginTop: '48px', pageBreakBefore: 'always' }}>
            <hr style={{ border: 'none', borderTop: '2px solid #2C2A26', marginBottom: '16px' }} />
            <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '24px', letterSpacing: '0.5px' }}>ANEXO DE IMAGENS</div>
            {itensComImagens.map((item, idx) => (
              <div key={item.id} style={{ marginBottom: '32px' }}>
                <div style={{ backgroundColor: '#5B47C8', padding: '8px 16px', marginBottom: '12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    ITEM {String(orc.itens.indexOf(item) + 1).padStart(2, '0')} — {item.descricao.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '0 4px' }}>
                  {item.imagens.map((img, j) => (
                    <div key={img.id} style={{ textAlign: 'center' }}>
                      <img
                        src={img.imagemBase64}
                        alt={img.nomeArquivo}
                        style={{ maxWidth: '220px', maxHeight: '180px', objectFit: 'contain', border: '1px solid #e8e6e0', borderRadius: '4px' }}
                      />
                      <div style={{ fontSize: '10px', color: '#6B6860', marginTop: '4px' }}>Figura {idx + 1}.{j + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
