import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'

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
    if (!Permissoes.podeVerRelatorios(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para acessar relatórios' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') ?? 'mes'
    const dataInicio = calcularPeriodo(periodo)

    const whereData = dataInicio ? { createdAt: { gte: dataInicio } } : {}

    const pedidos = await prisma.pedido.findMany({
      where: whereData,
      select: {
        id: true, numero: true, descricao: true, status: true,
        valorTotal: true, createdAt: true, prazoEntrega: true,
        clienteId: true,
        cliente: { select: { nome: true, empresa: true } },
        workspace: {
          select: {
            frete: true,
            itens: { select: { valorUnitario: true, quantidade: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Computar valorTotal: usa Pedido.valorTotal se preenchido, senão calcula a partir do Workspace
    function computarValor(p: typeof pedidos[number]): number | null {
      if (p.valorTotal != null) return Number(p.valorTotal)
      if (p.workspace?.itens && p.workspace.itens.length > 0) {
        const subtotal = p.workspace.itens.reduce(
          (s, it) => s + (Number(it.valorUnitario ?? 0) * it.quantidade), 0
        )
        const frete = Number(p.workspace.frete ?? 0)
        return subtotal + frete
      }
      return null
    }

    // KPIs
    const pedidosAtivos = pedidos.filter(p => !['CONCLUIDO', 'ENTREGUE', 'CANCELADO'].includes(p.status))
    const pedidosConcluidos = pedidos.filter(p => ['CONCLUIDO', 'ENTREGUE'].includes(p.status))

    // Receita Esperada = soma de TODOS os pedidos (exceto cancelados)
    const receitaEsperada = pedidos
      .filter(p => p.status !== 'CANCELADO')
      .reduce((s, p) => s + (computarValor(p) ?? 0), 0)

    // Receita Real = soma apenas dos concluídos/entregues
    const receitaReal = pedidosConcluidos.reduce((s, p) => s + (computarValor(p) ?? 0), 0)

    // Receita mensal (ano atual) — para gráfico de barras
    const anoAtual = new Date().getFullYear()
    const receitaMensal = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: 0 }))
    for (const p of pedidos) {
      if (['CONCLUIDO', 'ENTREGUE'].includes(p.status) && p.createdAt.getFullYear() === anoAtual) {
        const mes = p.createdAt.getMonth()
        receitaMensal[mes].valor += computarValor(p) ?? 0
      }
    }

    // Distribuição por status — para gráfico de pizza
    const contStatus: Record<string, number> = {}
    for (const p of pedidos) {
      contStatus[p.status] = (contStatus[p.status] ?? 0) + 1
    }
    const distribuicaoStatus = Object.entries(contStatus).map(([status, quantidade]) => ({ status, quantidade }))

    // Top clientes
    const mapaClientes = new Map<string, { id: string; nome: string; empresa: string | null; totalPedidos: number; receitaTotal: number }>()
    for (const p of pedidos) {
      if (!mapaClientes.has(p.clienteId)) {
        mapaClientes.set(p.clienteId, { id: p.clienteId, nome: p.cliente.nome, empresa: p.cliente.empresa ?? null, totalPedidos: 0, receitaTotal: 0 })
      }
      const c = mapaClientes.get(p.clienteId)!
      c.totalPedidos++
      c.receitaTotal += computarValor(p) ?? 0
    }
    const clientesComPedidos = [...mapaClientes.values()]
      .sort((a, b) => b.receitaTotal - a.receitaTotal)
      .slice(0, 20)

    return NextResponse.json({
      kpis: {
        totalPedidos:      pedidos.length,
        pedidosConcluidos: pedidosConcluidos.length,
        pedidosAtivos:     pedidosAtivos.length,
        receitaEsperada,
        receitaReal,
        totalClientes:     clientesComPedidos.length,
      },
      pedidos: pedidos.map(p => ({
        id:          p.id,
        numero:      p.numero,
        clienteNome: p.cliente.nome,
        descricao:   p.descricao,
        status:      p.status,
        valorTotal:  computarValor(p),
        createdAt:   p.createdAt.toISOString(),
        prazoEntrega: p.prazoEntrega?.toISOString() ?? null,
      })),
      clientes: clientesComPedidos,
      receitaMensal,
      distribuicaoStatus,
    })
  } catch (erro) {
    console.error('Erro ao gerar relatório:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
