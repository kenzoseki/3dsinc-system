import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'alertas@3dsinc.com.br'

export interface AlertaEstoqueParams {
  para: string
  filamentos: { marca: string; material: string; cor: string; pesoAtual: number; pesoTotal: number }[]
}

export interface AlertaPedidoAtrasadoParams {
  para: string
  pedidos: { numero: number; cliente: string; descricao: string; prazo: string; status: string }[]
}

export async function enviarAlertaEstoqueBaixo({ para, filamentos }: AlertaEstoqueParams) {
  const linhas = filamentos.map(f => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E6E0;font-family:Inter,sans-serif;font-size:14px;color:#2C2A26">${f.marca} ${f.material} ${f.cor}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E6E0;font-family:monospace;font-size:13px;color:#B83232;text-align:right">${f.pesoAtual}g / ${f.pesoTotal}g (${Math.round((f.pesoAtual / f.pesoTotal) * 100)}%)</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:Inter,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#FAF9F6;border:1px solid #E8E6E0;border-radius:12px;overflow:hidden">
    <div style="background:#5B47C8;padding:24px 28px">
      <p style="margin:0;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">3D Sinc — Alerta de Estoque</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700">Filamentos com estoque crítico</h1>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 16px;color:#6B6860;font-size:14px">${filamentos.length} filamento${filamentos.length !== 1 ? 's' : ''} com estoque abaixo de 20%:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E8E6E0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#F5F3EE">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6B6860;text-transform:uppercase;letter-spacing:0.05em">Filamento</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;color:#6B6860;text-transform:uppercase;letter-spacing:0.05em">Peso atual</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <p style="margin:20px 0 0;color:#6B6860;font-size:13px">Acesse o sistema para reabastecer o estoque antes que os pedidos sejam afetados.</p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E8E6E0;background:#F5F3EE">
      <p style="margin:0;color:#6B6860;font-size:12px">3D Sinc — Sistema de Gestão · Alerta automático</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to: para,
    subject: `⚠️ Estoque crítico — ${filamentos.length} filamento${filamentos.length !== 1 ? 's' : ''} abaixo de 20%`,
    html,
  })
}

export async function enviarAlertaPedidoAtrasado({ para, pedidos }: AlertaPedidoAtrasadoParams) {
  const linhas = pedidos.map(p => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E6E0;font-family:monospace;font-size:13px;color:#6B6860">#${String(p.numero).padStart(4, '0')}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E6E0;font-family:Inter,sans-serif;font-size:14px;color:#2C2A26">${p.cliente}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E6E0;font-family:Inter,sans-serif;font-size:13px;color:#2C2A26;max-width:200px">${p.descricao}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E8E6E0;font-family:monospace;font-size:13px;color:#B83232;white-space:nowrap">${p.prazo}</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:Inter,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#FAF9F6;border:1px solid #E8E6E0;border-radius:12px;overflow:hidden">
    <div style="background:#B83232;padding:24px 28px">
      <p style="margin:0;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">3D Sinc — Alerta de Prazo</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700">Pedidos com prazo vencido</h1>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 16px;color:#6B6860;font-size:14px">${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} com prazo de entrega ultrapassado:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E8E6E0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#F5F3EE">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6B6860;text-transform:uppercase;letter-spacing:0.05em">#</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6B6860;text-transform:uppercase;letter-spacing:0.05em">Cliente</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6B6860;text-transform:uppercase;letter-spacing:0.05em">Descrição</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6B6860;text-transform:uppercase;letter-spacing:0.05em">Prazo</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <p style="margin:20px 0 0;color:#6B6860;font-size:13px">Acesse o sistema para atualizar o status ou contatar os clientes.</p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E8E6E0;background:#F5F3EE">
      <p style="margin:0;color:#6B6860;font-size:12px">3D Sinc — Sistema de Gestão · Alerta automático</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to: para,
    subject: `🔴 ${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} com prazo vencido`,
    html,
  })
}
