'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

type Nivel = 'total' | 'leitura' | 'nao'
type MatrizPermissoes = Record<string, Record<string, Nivel>>

const CARGOS_TODOS = ['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR', 'VISUALIZADOR'] as const
const CARGOS_SEM_ADMIN = ['SOCIO', 'GERENTE', 'OPERADOR', 'VISUALIZADOR'] as const

const labelCargo: Record<string, string> = {
  ADMIN: 'Admin', SOCIO: 'Sócio', GERENTE: 'Gerente',
  OPERADOR: 'Operador', VISUALIZADOR: 'Visualizador',
}

const descricaoCargo: Record<string, string> = {
  ADMIN: 'Acesso total ao sistema, gerencia equipe e configurações.',
  SOCIO: 'Acesso total a dados e relatórios, sem gerenciar equipe ou sistema.',
  GERENTE: 'Acesso operacional completo, sem relatórios financeiros.',
  OPERADOR: 'Acesso operacional a pedidos e estoque.',
  VISUALIZADOR: 'Somente leitura em todas as áreas permitidas.',
}

const grupos: { titulo: string; areas: { area: string; descricao: string }[] }[] = [
  {
    titulo: 'Geral',
    areas: [
      { area: 'Dashboard', descricao: 'KPIs, gráficos e visão geral' },
      { area: 'Assistente IA', descricao: 'Chat com IA e contexto ERP' },
    ],
  },
  {
    titulo: 'Comercial',
    areas: [
      { area: 'Pedidos', descricao: 'Criar, editar, alterar status' },
      { area: 'Orçamentos', descricao: 'Criar, editar, gerar PDF' },
      { area: 'Clientes', descricao: 'Cadastrar e editar clientes' },
      { area: 'CRM', descricao: 'Pipeline de vendas e leads' },
    ],
  },
  {
    titulo: 'Operacional',
    areas: [
      { area: 'Produção', descricao: 'Fila de produção e ações' },
      { area: 'Estoque', descricao: 'Filamentos, alertas e movimentação' },
    ],
  },
  {
    titulo: 'Administração',
    areas: [
      { area: 'Relatórios', descricao: 'Relatórios gerenciais e financeiros' },
      { area: 'Equipe', descricao: 'Ver membros e gerenciar cargos' },
      { area: 'Convites', descricao: 'Gerar convites para novos membros' },
      { area: 'Configurações', descricao: 'Dados da empresa e notificações' },
    ],
  },
]

const nivelCiclo: Nivel[] = ['total', 'leitura', 'nao']
const badgeEstilo: Record<Nivel, { bg: string; cor: string; label: string }> = {
  total:   { bg: '#E8F5EE', cor: '#1A6B42', label: 'Total' },
  leitura: { bg: '#FEF3E2', cor: '#8A5A0A', label: 'Leitura' },
  nao:     { bg: '#F3F2EF', cor: '#6B6860', label: '—' },
}

export default function PaginaPermissoes() {
  const { data: session } = useSession()
  const router = useRouter()
  const cargo = session?.user?.cargo

  const [permissoes, setPermissoes] = useState<MatrizPermissoes | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const isAdmin = cargo === 'ADMIN'
  const isSocio = cargo === 'SOCIO'
  const cargosVisiveis = isAdmin ? CARGOS_TODOS : CARGOS_SEM_ADMIN

  useEffect(() => {
    if (cargo && cargo !== 'ADMIN' && cargo !== 'SOCIO') {
      router.push('/dashboard')
    }
  }, [cargo, router])

  const carregarPermissoes = useCallback(async () => {
    const r = await fetch('/api/configuracoes/permissoes')
    if (r.ok) {
      const dados = await r.json()
      setPermissoes(dados.permissoes)
    }
  }, [])

  useEffect(() => {
    if (cargo === 'ADMIN' || cargo === 'SOCIO') {
      carregarPermissoes()
    }
  }, [cargo, carregarPermissoes])

  function ciclarNivel(cargoAlvo: string, area: string) {
    if (!permissoes) return
    // SOCIO não pode alterar ADMIN
    if (isSocio && cargoAlvo === 'ADMIN') return

    const nivelAtual = permissoes[cargoAlvo]?.[area] ?? 'nao'
    const idx = nivelCiclo.indexOf(nivelAtual)
    const proximo = nivelCiclo[(idx + 1) % nivelCiclo.length]

    setPermissoes(prev => ({
      ...prev!,
      [cargoAlvo]: { ...(prev![cargoAlvo] ?? {}), [area]: proximo },
    }))
  }

  async function salvar() {
    if (!permissoes) return
    setSalvando(true)
    setMensagem('')
    try {
      const r = await fetch('/api/configuracoes/permissoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissoes }),
      })
      if (r.ok) {
        setMensagem('✓ Permissões salvas com sucesso!')
        setTimeout(() => setMensagem(''), 3000)
      } else {
        const dados = await r.json()
        setMensagem('✗ ' + (dados.erro ?? 'Erro ao salvar'))
        setTimeout(() => setMensagem(''), 4000)
      }
    } finally {
      setSalvando(false)
    }
  }

  if (!cargo || (cargo !== 'ADMIN' && cargo !== 'SOCIO')) return null
  if (!permissoes) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Voltar */}
      <button
        onClick={() => router.push('/dashboard/configuracoes')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0, fontFamily: 'Inter, sans-serif' }}
      >
        ← Voltar para Configurações
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Acessos e Permissões
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            {isAdmin
              ? 'Clique em qualquer célula para alternar o nível de acesso de cada cargo.'
              : 'Você pode configurar os acessos de todos os cargos, exceto Admin.'}
          </p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
            fontFamily: 'Nunito, sans-serif', fontWeight: 600,
            backgroundColor: 'var(--purple)', color: '#fff', border: 'none',
            cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {salvando ? 'Salvando...' : 'Salvar permissões'}
        </button>
      </div>

      {mensagem && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px',
          fontFamily: 'Inter, sans-serif',
          backgroundColor: mensagem.startsWith('✓') ? 'var(--green-light)' : 'var(--red-light)',
          color: mensagem.startsWith('✓') ? 'var(--green)' : 'var(--red)',
        }}>
          {mensagem}
        </div>
      )}

      {/* Cards de cargo */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cargosVisiveis.length}, 1fr)`, gap: '12px', marginBottom: '28px' }}>
        {cargosVisiveis.map(c => (
          <div
            key={c}
            style={{
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '14px', textAlign: 'center',
              opacity: isSocio && c === 'ADMIN' ? 0.5 : 1,
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', marginBottom: '4px' }}>
              {labelCargo[c]}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0, lineHeight: '1.4' }}>
              {descricaoCargo[c]}
            </p>
          </div>
        ))}
      </div>

      {/* Tabelas por grupo */}
      {grupos.map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            {grupo.titulo}
          </h2>
          <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', width: '220px' }}>
                    Área
                  </th>
                  {cargosVisiveis.map(c => (
                    <th key={c} style={{ textAlign: 'center', padding: '10px 8px', fontSize: '11px', fontWeight: 500, fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {labelCargo[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupo.areas.map(({ area, descricao }, i) => (
                  <tr key={area} style={{ borderBottom: i < grupo.areas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>{area}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>{descricao}</p>
                    </td>
                    {cargosVisiveis.map(c => {
                      const nivel: Nivel = (permissoes[c]?.[area] as Nivel) ?? 'nao'
                      const badge = badgeEstilo[nivel]
                      const editavel = !(isSocio && c === 'ADMIN')
                      return (
                        <td key={c} style={{ textAlign: 'center', padding: '12px 8px' }}>
                          <button
                            onClick={() => editavel && ciclarNivel(c, area)}
                            title={editavel ? 'Clique para alternar' : 'Sem permissão para editar'}
                            style={{
                              display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
                              fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                              backgroundColor: badge.bg, color: badge.cor,
                              border: 'none', cursor: editavel ? 'pointer' : 'not-allowed',
                              transition: 'opacity 0.12s, transform 0.1s',
                              opacity: editavel ? 1 : 0.5,
                            }}
                            onMouseEnter={e => { if (editavel) (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
                            onMouseLeave={e => { if (editavel) (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                          >
                            {badge.label}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '24px', padding: '14px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0, fontWeight: 600 }}>
          Legenda:
        </p>
        {Object.entries(badgeEstilo).map(([, b]) => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: b.bg, color: b.cor }}>
              {b.label}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              {b.label === 'Total' ? 'Leitura e escrita' : b.label === 'Leitura' ? 'Somente visualização' : 'Sem acesso'}
            </span>
          </div>
        ))}
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0, marginLeft: 'auto' }}>
          Clique nas células para alternar • Salve para confirmar
        </p>
      </div>
    </div>
  )
}
