import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo, StatusPedido } from '@prisma/client'

// Schema de validacao para criacao de pedido
const schemaCriarPedido = z.object({
  clienteId:    z.string().min(1, 'Cliente obrigatorio'),
  orcamentoId:  z.string().optional().nullable(),
  tipo:         z.enum(['B2C', 'B2B']).default('B2C'),
  categoria:    z.string().max(100).optional().nullable(),
  descricao:    z.string().min(1, 'Descricao obrigatoria').max(1000),
  prioridade:   z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL'),
  prazoEntrega: z.string().datetime().optional().nullable(),
  valorTotal:   z.number().positive().optional().nullable(),
  observacoes:  z.string().max(5000).optional().nullable(),
  arquivo3d:    z.string().max(500).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10) || 1)
    const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') ?? '20', 10) || 20))
    const status = searchParams.get('status') as StatusPedido | null

    const where = status ? { status } : {}
    const skip = (pagina - 1) * limite

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({
        where,
        include: {
          cliente: true,
          itens: {
            include: { filamento: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limite,
      }),
      prisma.pedido.count({ where }),
    ])

    return NextResponse.json({
      pedidos,
      paginacao: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    })
  } catch (erro) {
    console.error('Erro ao listar pedidos:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    if (!Permissoes.podeEscreverPedidos(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissao para criar pedidos' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriarPedido.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const dados = validacao.data

    const pedido = await prisma.$transaction(async (tx) => {
      const novoPedido = await tx.pedido.create({
        data: {
          clienteId:    dados.clienteId,
          orcamentoId:  dados.orcamentoId ?? null,
          tipo:         dados.tipo,
          categoria:    dados.categoria ?? null,
          descricao:    dados.descricao,
          prioridade:   dados.prioridade,
          prazoEntrega: dados.prazoEntrega ? new Date(dados.prazoEntrega) : null,
          valorTotal:   dados.valorTotal ?? null,
          observacoes:  dados.observacoes ?? null,
          arquivo3d:    dados.arquivo3d ?? null,
          status:       'ORCAMENTO',
        },
        include: {
          cliente: true,
          itens: true,
        },
      })

      // Criar historico inicial
      await tx.historicoPedido.create({
        data: {
          pedidoId: novoPedido.id,
          usuarioId: session.user.id,
          status: 'ORCAMENTO',
          nota: 'Pedido criado',
        },
      })

      return novoPedido
    })

    return NextResponse.json(pedido, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar pedido:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
