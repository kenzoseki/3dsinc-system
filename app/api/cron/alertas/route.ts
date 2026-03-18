import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { enviarAlertaEstoqueBaixo, enviarAlertaPedidoAtrasado } from '@/lib/email'

// Protegido por CRON_SECRET no header Authorization: Bearer <secret>
function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const config = await prisma.configuracaoEmpresa.findUnique({ where: { id: 'empresa' } })

    // Sem email configurado ou alertas desabilitados — nada a fazer
    const emailDestino = config?.emailAlertas ?? config?.email
    if (!emailDestino || !config?.alertaEmailHabilitado) {
      return NextResponse.json({ mensagem: 'Alertas por email desabilitados ou email não configurado', enviados: 0 })
    }

    const resultados: string[] = []

    // --- Alerta de estoque baixo ---
    if (config.alertaEstoqueBaixo) {
      const alertasNaoLidos = await prisma.alertaEstoque.findMany({
        where: { lido: false, tipoAlerta: 'ESTOQUE_BAIXO' },
        include: { filamento: true },
      })

      if (alertasNaoLidos.length > 0) {
        const filamentos = alertasNaoLidos.map(a => ({
          marca:     a.filamento.marca,
          material:  a.filamento.material,
          cor:       a.filamento.cor,
          pesoAtual: Number(a.filamento.pesoAtual),
          pesoTotal: Number(a.filamento.pesoTotal),
        }))

        await enviarAlertaEstoqueBaixo({ para: emailDestino, filamentos })

        // Marca todos como lidos
        await prisma.alertaEstoque.updateMany({
          where: { id: { in: alertasNaoLidos.map(a => a.id) } },
          data:  { lido: true },
        })

        resultados.push(`Estoque: ${filamentos.length} alerta(s) enviado(s) e marcado(s) como lido(s)`)
      } else {
        resultados.push('Estoque: sem alertas pendentes')
      }
    }

    // --- Alerta de pedidos atrasados ---
    if (config.alertaPedidoAtrasado) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const pedidosAtrasados = await prisma.pedido.findMany({
        where: {
          prazoEntrega: { lt: hoje },
          status: { notIn: ['ENTREGUE', 'CANCELADO'] },
        },
        include: { cliente: true },
        orderBy: { prazoEntrega: 'asc' },
      })

      if (pedidosAtrasados.length > 0) {
        const pedidos = pedidosAtrasados.map(p => ({
          numero:    p.numero,
          cliente:   p.cliente.nome,
          descricao: p.descricao,
          prazo:     p.prazoEntrega!.toLocaleDateString('pt-BR'),
          status:    p.status,
        }))

        await enviarAlertaPedidoAtrasado({ para: emailDestino, pedidos })
        resultados.push(`Pedidos: ${pedidos.length} pedido(s) atrasado(s) notificado(s)`)
      } else {
        resultados.push('Pedidos: sem atrasos')
      }
    }

    return NextResponse.json({ mensagem: 'Verificação concluída', detalhes: resultados })
  } catch (erro) {
    console.error('Erro no cron de alertas:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
