'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AlertaEstoque {
  id: string
  tipoAlerta: string
  lido: boolean
}

interface Filamento {
  id: string
  marca: string
  material: string
  cor: string
  corHex: string | null
  diametro: string
  pesoTotal: string
  pesoAtual: string
  temperatura: number | null
  velocidade: number | null
  localizacao: string | null
  ativo: boolean
  alertas: AlertaEstoque[]
}

function BarraProgresso({ pesoAtual, pesoTotal }: { pesoAtual: number; pesoTotal: number }) {
  const percentual = pesoTotal > 0 ? Math.min(100, (pesoAtual / pesoTotal) * 100) : 0
  const corBarra = percentual < 20 ? 'var(--red)' : percentual < 40 ? 'var(--amber)' : 'var(--purple)'
  const corTexto = percentual < 20 ? 'var(--red)' : percentual < 40 ? 'var(--amber)' : 'var(--green)'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{pesoAtual.toFixed(0)}g</span>
        <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{pesoTotal.toFixed(0)}g</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', backgroundColor: 'var(--bg-hover)' }}>
        <div style={{ height: '100%', borderRadius: '3px', width: `${percentual}%`, backgroundColor: corBarra, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '12px', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace', color: corTexto, fontWeight: 600 }}>
        {percentual.toFixed(0)}%
      </div>
    </div>
  )
}

export default function PaginaEstoque() {
  const router = useRouter()
  const [filamentos, setFilamentos] = useState<Filamento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarFilamentos() {
      try {
        const resposta = await fetch('/api/filamentos')
        if (resposta.ok) {
          const dados = await resposta.json()
          setFilamentos(dados)
        }
      } catch (erro) {
        console.error('Erro ao carregar filamentos:', erro)
      } finally {
        setCarregando(false)
      }
    }
    carregarFilamentos()
  }, [])

  const filamentosComAlerta = filamentos.filter(f => f.alertas.some(a => !a.lido))

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>
            Estoque
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: '4px', fontSize: '13px' }}>
            Gerenciamento de filamentos
          </p>
        </div>
        <Link
          href="/dashboard/estoque/novo"
          style={{
            padding: '9px 16px',
            backgroundColor: 'var(--purple)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Nunito, sans-serif',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--purple-dark)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--purple)' }}
        >
          + Novo Filamento
        </Link>
      </div>

      {/* Alertas de estoque baixo */}
      {filamentosComAlerta.length > 0 && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          backgroundColor: 'var(--red-light)',
          border: '1px solid #F5C6C6',
        }}>
          <p style={{ fontWeight: 600, color: 'var(--red)', fontFamily: 'Inter, sans-serif', fontSize: '13px', marginBottom: '8px' }}>
            Alertas de Estoque Baixo ({filamentosComAlerta.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {filamentosComAlerta.map(f => (
              <span
                key={f.id}
                style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif',
                  backgroundColor: '#fff',
                  color: 'var(--red)',
                  border: '1px solid #F5C6C6',
                }}
              >
                {f.marca} {f.material} {f.cor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid de filamentos */}
      {carregando ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
          Carregando filamentos...
        </div>
      ) : filamentos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif',
        }}>
          <p style={{ fontSize: '15px', marginBottom: '8px' }}>Nenhum filamento cadastrado</p>
          <Link href="/dashboard/estoque/novo" style={{ color: 'var(--purple)', fontSize: '13px' }}>
            Adicionar primeiro filamento →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filamentos.map((filamento) => {
            const temAlerta = filamento.alertas.some(a => !a.lido)
            const pesoAtual = parseFloat(filamento.pesoAtual)
            const pesoTotal = parseFloat(filamento.pesoTotal)

            return (
              <div
                key={filamento.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${temAlerta ? '#F5C6C6' : 'var(--border)'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {/* Cabeçalho do card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: filamento.corHex ?? '#888',
                      border: '2px solid var(--border)',
                    }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' }}>
                        {filamento.marca}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                        {filamento.material} · {filamento.cor}
                      </p>
                    </div>
                  </div>
                  {temAlerta && (
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--red-light)',
                      color: 'var(--red)',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                    }}>
                      Baixo
                    </span>
                  )}
                </div>

                {/* Barra de progresso */}
                <BarraProgresso pesoAtual={pesoAtual} pesoTotal={pesoTotal} />

                {/* Dados adicionais */}
                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Diâmetro: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{filamento.diametro}mm</span>
                  </div>
                  {filamento.temperatura && (
                    <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Temp: </span>
                      <span style={{ color: 'var(--text-primary)' }}>{filamento.temperatura}°C</span>
                    </div>
                  )}
                  {filamento.localizacao && (
                    <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Local: </span>
                      <span style={{ color: 'var(--text-primary)' }}>{filamento.localizacao}</span>
                    </div>
                  )}
                </div>

                {/* Botão editar */}
                <button
                  onClick={() => router.push(`/dashboard/estoque/${filamento.id}/editar`)}
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    padding: '7px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--purple)'
                    e.currentTarget.style.color = 'var(--purple)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  Editar
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
