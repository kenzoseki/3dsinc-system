import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaCriarCliente = z.object({
  nome: z.string().min(1, 'Nome obrigatorio').max(200),
  email: z.string().email().max(200).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  empresa: z.string().max(200).optional().nullable(),
  cpfCnpj: z.string().max(30).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const buscaRaw = searchParams.get('busca')
    const busca = buscaRaw ? buscaRaw.slice(0, 100) : null
    const paginado = searchParams.get('paginado') === 'true'
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10))
    const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') ?? '25', 10)))

    const where = busca
      ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' as const } },
            { empresa: { contains: busca, mode: 'insensitive' as const } },
            { email: { contains: busca, mode: 'insensitive' as const } },
          ],
        }
      : {}

    if (paginado) {
      const [clientes, total] = await Promise.all([
        prisma.cliente.findMany({
          where,
          orderBy: { nome: 'asc' },
          skip: (pagina - 1) * limite,
          take: limite,
          include: { _count: { select: { pedidos: true } } },
        }),
        prisma.cliente.count({ where }),
      ])

      return NextResponse.json({
        clientes,
        paginacao: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
      })
    }

    // Modo compatibilidade — retorna array plano (usado pelo seletor de clientes em pedidos e autocomplete)
    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: limite,
    })

    return NextResponse.json(clientes)
  } catch (erro) {
    console.error('Erro ao listar clientes:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissao para criar clientes' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriarCliente.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const dados = validacao.data

    const cliente = await prisma.cliente.create({
      data: {
        nome: dados.nome,
        email: dados.email ?? null,
        telefone: dados.telefone ?? null,
        empresa: dados.empresa ?? null,
        cpfCnpj: dados.cpfCnpj ?? null,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar cliente:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
