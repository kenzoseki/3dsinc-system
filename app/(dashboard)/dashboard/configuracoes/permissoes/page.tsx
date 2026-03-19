'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const CARGOS = ['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR', 'VISUALIZADOR'] as const

const labelCargo: Record<string, string> = {
  ADMIN: 'Admin',
  SOCIO: 'Sócio',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

const descricaoCargo: Record<string, string> = {
  ADMIN: 'Acesso total ao sistema, gerencia equipe e configurações.',
  SOCIO: 'Acesso total a dados e relatórios, sem gerenciar equipe ou sistema.',
  GERENTE: 'Acesso operacional completo, sem relatórios financeiros.',
  OPERADOR: 'Acesso operacional a pedidos e estoque.',
  VISUALIZADOR: 'Somente leitura em todas as áreas permitidas.',
}

type Permissao = {
  area: string
  descricao: string
  cargos: Record<string, 'total' | 'leitura' | 'nao'>
}

const grupos: { titulo: string; permissoes: Permissao[] }[] = [
  {
    titulo: 'Geral',
    permissoes: [
      {
        area: 'Dashboard',
        descricao: 'KPIs, gráficos e visão geral',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'leitura', VISUALIZADOR: 'leitura' },
      },
      {
        area: 'Assistente IA',
        descricao: 'Chat com IA e contexto ERP',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'nao' },
      },
    ],
  },
  {
    titulo: 'Comercial',
    permissoes: [
      {
        area: 'Pedidos',
        descricao: 'Criar, editar, alterar status',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'leitura' },
      },
      {
        area: 'Orçamentos',
        descricao: 'Criar, editar, gerar PDF',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'leitura' },
      },
      {
        area: 'Clientes',
        descricao: 'Cadastrar e editar clientes',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'leitura' },
      },
      {
        area: 'CRM',
        descricao: 'Pipeline de vendas e leads',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'nao' },
      },
    ],
  },
  {
    titulo: 'Operacional',
    permissoes: [
      {
        area: 'Produção',
        descricao: 'Fila de produção e ações',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'nao' },
      },
      {
        area: 'Estoque',
        descricao: 'Filamentos, alertas e movimentação',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'total', OPERADOR: 'total', VISUALIZADOR: 'leitura' },
      },
    ],
  },
  {
    titulo: 'Administração',
    permissoes: [
      {
        area: 'Relatórios',
        descricao: 'Relatórios gerenciais e financeiros',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'nao', OPERADOR: 'nao', VISUALIZADOR: 'nao' },
      },
      {
        area: 'Equipe',
        descricao: 'Ver membros e gerenciar cargos',
        cargos: { ADMIN: 'total', SOCIO: 'leitura', GERENTE: 'leitura', OPERADOR: 'nao', VISUALIZADOR: 'nao' },
      },
      {
        area: 'Convites',
        descricao: 'Gerar convites para novos membros',
        cargos: { ADMIN: 'total', SOCIO: 'total', GERENTE: 'nao', OPERADOR: 'nao', VISUALIZADOR: 'nao' },
      },
      {
        area: 'Configurações',
        descricao: 'Dados da empresa e notificações',
        cargos: { ADMIN: 'total', SOCIO: 'leitura', GERENTE: 'nao', OPERADOR: 'nao', VISUALIZADOR: 'nao' },
      },
    ],
  },
]

const badgeEstilo = {
  total:   { bg: '#E8F5EE', cor: '#1A6B42', label: 'Total' },
  leitura: { bg: '#FEF3E2', cor: '#8A5A0A', label: 'Leitura' },
  nao:     { bg: '#F3F2EF', cor: '#6B6860', label: '—' },
}

export default function PaginaPermissoes() {
  const { data: session } = useSession()
  const router = useRouter()
  const cargo = session?.user?.cargo

  useEffect(() => {
    if (cargo && cargo !== 'ADMIN' && cargo !== 'SOCIO') {
      router.push('/dashboard')
    }
  }, [cargo, router])

  if (!cargo || (cargo !== 'ADMIN' && cargo !== 'SOCIO')) return null

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Voltar */}
      <button
        onClick={() => router.push('/dashboard/configuracoes')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0, fontFamily: 'Inter, sans-serif' }}
      >
        ← Voltar para Configurações
      </button>

      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        Acessos e Permissões
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginBottom: '28px' }}>
        Matriz de permissões por cargo no sistema.
      </p>

      {/* Cards de cargo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {CARGOS.map(c => (
          <div
            key={c}
            style={{
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '16px', textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--purple)', fontFamily: 'Nunito, sans-serif', marginBottom: '6px' }}>
              {labelCargo[c]}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0, lineHeight: '1.4' }}>
              {descricaoCargo[c]}
            </p>
          </div>
        ))}
      </div>

      {/* Tabelas de permissões por grupo */}
      {grupos.map(grupo => (
        <div key={grupo.titulo} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            {grupo.titulo}
          </h2>
          <div style={{
            borderRadius: '10px', overflow: 'hidden',
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <th style={{
                    textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 500,
                    fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', width: '220px',
                  }}>
                    Área
                  </th>
                  {CARGOS.map(c => (
                    <th key={c} style={{
                      textAlign: 'center', padding: '10px 8px', fontSize: '11px', fontWeight: 500,
                      fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {labelCargo[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupo.permissoes.map((perm, i) => (
                  <tr key={perm.area} style={{ borderBottom: i < grupo.permissoes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>
                        {perm.area}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                        {perm.descricao}
                      </p>
                    </td>
                    {CARGOS.map(c => {
                      const nivel = perm.cargos[c] ?? 'nao'
                      const badge = badgeEstilo[nivel]
                      return (
                        <td key={c} style={{ textAlign: 'center', padding: '12px 8px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                            backgroundColor: badge.bg, color: badge.cor,
                          }}>
                            {badge.label}
                          </span>
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
      <div style={{
        display: 'flex', gap: '24px', padding: '16px 20px',
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '10px', marginTop: '8px',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', margin: 0, fontWeight: 600 }}>
          Legenda:
        </p>
        {Object.entries(badgeEstilo).map(([, b]) => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
              fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              backgroundColor: b.bg, color: b.cor,
            }}>
              {b.label}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              {b.label === 'Total' ? 'Leitura e escrita' : b.label === 'Leitura' ? 'Somente visualização' : 'Sem acesso'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
