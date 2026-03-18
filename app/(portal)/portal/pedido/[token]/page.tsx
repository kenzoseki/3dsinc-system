import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'

const STATUS_INFO: Record<string, { label: string; bg: string; cor: string; descricao: string }> = {
  ORCAMENTO:   { label: 'Orçamento',    bg: '#FCE9E9', cor: '#B83232', descricao: 'Aguardando aprovação do orçamento.' },
  APROVADO:    { label: 'Aprovado',     bg: '#FEF3E2', cor: '#8A5A0A', descricao: 'Pedido aprovado, entrará em produção em breve.' },
  AGUARDANDO:  { label: 'Aguardando',   bg: '#FEF3E2', cor: '#8A5A0A', descricao: 'Na fila de produção.' },
  EM_PRODUCAO: { label: 'Em Produção',  bg: '#EDE9FC', cor: '#4C3DB5', descricao: 'Seu pedido está sendo produzido.' },
  PAUSADO:     { label: 'Pausado',      bg: '#FCE9E9', cor: '#B83232', descricao: 'Produção temporariamente pausada.' },
  CONCLUIDO:   { label: 'Concluído',    bg: '#E8F5EE', cor: '#1A6B42', descricao: 'Produção finalizada. Aguardando envio.' },
  ENTREGUE:    { label: 'Entregue',     bg: '#E8F5EE', cor: '#1A6B42', descricao: 'Pedido entregue. Obrigado!' },
  CANCELADO:   { label: 'Cancelado',    bg: '#F3F2EF', cor: '#6B6860', descricao: 'Este pedido foi cancelado.' },
}

export default async function PortalPedidoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const pedido = await prisma.pedido.findUnique({
    where: { tokenPortal: token },
    select: {
      numero:       true,
      descricao:    true,
      status:       true,
      prazoEntrega: true,
      createdAt:    true,
      cliente: { select: { nome: true, empresa: true } },
      itens: { select: { descricao: true, quantidade: true } },
      historico: {
        select: { status: true, nota: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!pedido) notFound()

  const st = STATUS_INFO[pedido.status] ?? STATUS_INFO.CANCELADO
  const atrasado = pedido.prazoEntrega && new Date(pedido.prazoEntrega) < new Date() && !['CONCLUIDO', 'ENTREGUE', 'CANCELADO'].includes(pedido.status)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EE', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#5B47C8', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: 'Nunito, sans-serif' }}>3D</span>
        </div>
        <div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            3D Sinc
          </p>
          <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 600 }}>
            Acompanhamento de Pedido
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '28px 16px' }}>
        {/* Card principal */}
        <div style={{ background: '#FAF9F6', border: '1px solid #E8E6E0', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                Pedido #{String(pedido.numero).padStart(4, '0')}
              </p>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#2C2A26', fontFamily: 'Nunito, sans-serif', lineHeight: 1.3 }}>
                {pedido.descricao}
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6B6860' }}>
                {pedido.cliente.nome}{pedido.cliente.empresa ? ` · ${pedido.cliente.empresa}` : ''}
              </p>
            </div>
            <span style={{
              display: 'inline-block', padding: '6px 14px', borderRadius: '20px',
              fontSize: '13px', fontWeight: 600,
              background: st.bg, color: st.cor,
            }}>
              {st.label}
            </span>
          </div>

          <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#6B6860', background: '#F5F3EE', padding: '10px 14px', borderRadius: '8px' }}>
            {st.descricao}
          </p>

          {pedido.prazoEntrega && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#6B6860' }}>Prazo estimado:</span>
              <span style={{
                fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                color: atrasado ? '#B83232' : '#2C2A26',
              }}>
                {new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                {atrasado && ' ⚠️'}
              </span>
            </div>
          )}
        </div>

        {/* Itens do pedido */}
        {pedido.itens.length > 0 && (
          <div style={{ background: '#FAF9F6', border: '1px solid #E8E6E0', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: '#2C2A26', fontFamily: 'Nunito, sans-serif' }}>
              Itens do pedido
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pedido.itens.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < pedido.itens.length - 1 ? '1px solid #E8E6E0' : 'none' }}>
                  <span style={{ fontSize: '13px', color: '#2C2A26' }}>{item.descricao}</span>
                  <span style={{ fontSize: '12px', color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                    ×{item.quantidade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de status */}
        {pedido.historico.length > 0 && (
          <div style={{ background: '#FAF9F6', border: '1px solid #E8E6E0', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#2C2A26', fontFamily: 'Nunito, sans-serif' }}>
              Histórico
            </h2>
            <div style={{ position: 'relative' }}>
              {pedido.historico.map((h, i) => {
                const hSt = STATUS_INFO[h.status] ?? STATUS_INFO.CANCELADO
                return (
                  <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: i < pedido.historico.length - 1 ? '16px' : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: hSt.cor, flexShrink: 0, marginTop: '3px' }} />
                      {i < pedido.historico.length - 1 && (
                        <div style={{ width: '1px', flex: 1, background: '#E8E6E0', minHeight: '16px', marginTop: '4px' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: '4px' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#2C2A26' }}>
                        {hSt.label}
                      </p>
                      {h.nota && <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6B6860' }}>{h.nota}</p>}
                      <p style={{ margin: 0, fontSize: '11px', color: '#6B6860', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(h.createdAt).toLocaleDateString('pt-BR')} {new Date(h.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#6B6860' }}>
          3D Sinc · Este link é único para o seu pedido
        </p>
      </div>
    </div>
  )
}
