import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

function calcularPeriodo(periodo: string): Date | null {
  const agora = new Date()
  switch (periodo) {
    case 'mes':
      return new Date(agora.getFullYear(), agora.getMonth(), 1)
    case 'trimestre': {
      const d = new Date(agora)
      d.setDate(d.getDate() - 90)
      return d
    }
    case 'ano':
      return new Date(agora.getFullYear(), 0, 1)
    default:
      return null // todos os tempos
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') ?? 'mes'
    const dataInicio = calcularPeriodo(periodo)

    const whereData = dataInicio ? { createdAt: { gte: dataInicio } } : {}

    const [pedidos, clientes, filamentos] = await Promise.all([
      prisma.pedido.findMany({
        where: whereData,
        include: { cliente: { select: { nome: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cliente.findMany({
        include: {
          pedidos: {
            where: whereData,
            select: { valorTotal: true },
          },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.filamento.findMany({
        where: { ativo: true },
        orderBy: { pesoAtual: 'asc' },
      }),
    ])

    // KPIs
    const pedidosAtivos   = pedidos.filter(p => !['CONCLUIDO', 'ENTREGUE', 'CANCELADO'].includes(p.status))
    const pedidosConcluidos = pedidos.filter(p => ['CONCLUIDO', 'ENTREGUE'].includes(p.status))
    const receitaTotal = pedidos.reduce((s, p) => s + Number(p.valorTotal ?? 0), 0)

    // Top clientes por receita (apenas quem tem pedidos no período)
    const clientesComPedidos = clientes
      .map(c => ({
        id:          c.id,
        nome:        c.nome,
        empresa:     c.empresa,
        totalPedidos: c.pedidos.length,
        receitaTotal: c.pedidos.reduce((s, p) => s + Number(p.valorTotal ?? 0), 0),
      }))
      .filter(c => c.totalPedidos > 0)
      .sort((a, b) => b.receitaTotal - a.receitaTotal)
      .slice(0, 20)

    return NextResponse.json({
      kpis: {
        totalPedidos:      pedidos.length,
        pedidosConcluidos: pedidosConcluidos.length,
        pedidosAtivos:     pedidosAtivos.length,
        receitaTotal,
        totalClientes:     clientesComPedidos.length,
      },
      pedidos: pedidos.map(p => ({
        id:          p.id,
        numero:      p.numero,
        clienteNome: p.cliente.nome,
        descricao:   p.descricao,
        status:      p.status,
        valorTotal:  p.valorTotal != null ? Number(p.valorTotal) : null,
        createdAt:   p.createdAt.toISOString(),
        prazoEntrega: p.prazoEntrega?.toISOString() ?? null,
      })),
      clientes: clientesComPedidos,
      filamentos: filamentos.map(f => ({
        id:        f.id,
        marca:     f.marca,
        material:  f.material,
        cor:       f.cor,
        pesoAtual: Number(f.pesoAtual),
        pesoTotal: Number(f.pesoTotal),
      })),
    })
  } catch (erro) {
    console.error('Erro ao gerar relatório:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
