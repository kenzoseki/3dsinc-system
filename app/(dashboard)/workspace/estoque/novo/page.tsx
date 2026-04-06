'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

const schemaFilamento = z.object({
  marca: z.string().min(1, 'Marca obrigatória'),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PLA_PLUS', 'RESIN_STANDARD', 'RESIN_ABS_LIKE', 'NYLON', 'OUTRO']),
  cor: z.string().min(1, 'Cor obrigatória'),
  corHex: z.string().optional(),
  diametro: z.string().min(1, 'Diâmetro obrigatório'),
  pesoTotal: z.string().min(1, 'Peso total obrigatório'),
  pesoAtual: z.string().min(1, 'Peso atual obrigatório'),
  temperatura: z.string().optional(),
  velocidade: z.string().optional(),
  localizacao: z.string().optional(),
})

type CamposFormulario = keyof z.infer<typeof schemaFilamento>
type ErrosFormulario = Partial<Record<CamposFormulario, string>>

const materiaisOpcoes = [
  { valor: 'PLA', label: 'PLA' },
  { valor: 'PETG', label: 'PETG' },
  { valor: 'ABS', label: 'ABS' },
  { valor: 'TPU', label: 'TPU (Flexível)' },
  { valor: 'ASA', label: 'ASA' },
  { valor: 'PLA_PLUS', label: 'PLA+' },
  { valor: 'RESIN_STANDARD', label: 'Resina Standard' },
  { valor: 'RESIN_ABS_LIKE', label: 'Resina ABS-like' },
  { valor: 'NYLON', label: 'Nylon' },
  { valor: 'OUTRO', label: 'Outro' },
]

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

export default function PaginaNovoFilamento() {
  const router = useRouter()

  const [marca, setMarca] = useState('')
  const [material, setMaterial] = useState('PLA')
  const [cor, setCor] = useState('')
  const [corHex, setCorHex] = useState('#ffffff')
  const [diametro, setDiametro] = useState('1.75')
  const [pesoTotal, setPesoTotal] = useState('1000')
  const [pesoAtual, setPesoAtual] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [velocidade, setVelocidade] = useState('')
  const [localizacao, setLocalizacao] = useState('')

  const [erros, setErros] = useState<ErrosFormulario>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErros({})
    setErroGeral('')

    const dados = { marca, material, cor, corHex, diametro, pesoTotal, pesoAtual, temperatura, velocidade, localizacao }
    const validacao = schemaFilamento.safeParse(dados)

    if (!validacao.success) {
      const novosErros: ErrosFormulario = {}
      for (const issue of validacao.error.issues) {
        const campo = issue.path[0] as CamposFormulario
        novosErros[campo] = issue.message
      }
      setErros(novosErros)
      return
    }

    setEnviando(true)

    try {
      const payload: Record<string, unknown> = {
        marca, material, cor,
        corHex: corHex || null,
        diametro: parseFloat(diametro),
        pesoTotal: parseFloat(pesoTotal),
        pesoAtual: parseFloat(pesoAtual),
      }

      if (temperatura) payload.temperatura = parseInt(temperatura)
      if (velocidade) payload.velocidade = parseInt(velocidade)
      if (localizacao) payload.localizacao = localizacao

      const resposta = await fetch('/api/filamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const dadosResposta = await resposta.json()

      if (!resposta.ok) {
        setErroGeral(dadosResposta.erro ?? 'Erro ao cadastrar filamento')
      } else {
        router.push('/workspace/estoque')
      }
    } catch {
      setErroGeral('Erro de comunicação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
          Novo Filamento
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
          Cadastre um novo rolo de filamento
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
          {/* Marca e Material */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={estiloLabel}>Marca *</label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ex: Bambu, Polymaker"
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              {erros.marca && <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.marca}</p>}
            </div>

            <div>
              <label style={estiloLabel}>Material *</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {materiaisOpcoes.map(({ valor, label }) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cor e Color Picker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={estiloLabel}>Cor *</label>
              <input
                type="text"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder="Ex: Preto, Branco, Azul"
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              {erros.cor && <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.cor}</p>}
            </div>

            <div>
              <label style={estiloLabel}>Cor Hex</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={corHex}
                  onChange={(e) => setCorHex(e.target.value)}
                  style={{ width: '44px', height: '42px', padding: '2px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: 'transparent' }}
                />
                <input
                  type="text"
                  value={corHex}
                  onChange={(e) => setCorHex(e.target.value)}
                  placeholder="#ffffff"
                  style={{ ...estiloInput, flex: 1, fontFamily: 'JetBrains Mono, monospace' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>
          </div>

          {/* Diâmetro e Pesos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={estiloLabel}>Diâmetro (mm) *</label>
              <select
                value={diametro}
                onChange={(e) => setDiametro(e.target.value)}
                style={estiloInput}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <option value="1.75">1.75mm</option>
                <option value="2.85">2.85mm</option>
              </select>
            </div>

            <div>
              <label style={estiloLabel}>Peso Total (g) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={pesoTotal}
                onChange={(e) => setPesoTotal(e.target.value)}
                placeholder="1000"
                style={{ ...estiloInput, fontFamily: 'JetBrains Mono, monospace' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              {erros.pesoTotal && <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.pesoTotal}</p>}
            </div>

            <div>
              <label style={estiloLabel}>Peso Atual (g) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pesoAtual}
                onChange={(e) => setPesoAtual(e.target.value)}
                placeholder="Ex: 850"
                style={{ ...estiloInput, fontFamily: 'JetBrains Mono, monospace' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              {erros.pesoAtual && <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>{erros.pesoAtual}</p>}
            </div>
          </div>

          {/* Temperatura e Velocidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={estiloLabel}>Temperatura (°C)</label>
              <input
                type="number"
                min="1"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                placeholder="Ex: 210"
                style={{ ...estiloInput, fontFamily: 'JetBrains Mono, monospace' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label style={estiloLabel}>Velocidade (mm/s)</label>
              <input
                type="number"
                min="1"
                value={velocidade}
                onChange={(e) => setVelocidade(e.target.value)}
                placeholder="Ex: 60"
                style={{ ...estiloInput, fontFamily: 'JetBrains Mono, monospace' }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Localização */}
          <div style={{ marginBottom: '18px' }}>
            <label style={estiloLabel}>Localização</label>
            <input
              type="text"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Ex: Prateleira A, Gaveta 2"
              style={estiloInput}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--purple)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
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
              {enviando ? 'Cadastrando...' : 'Cadastrar Filamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
