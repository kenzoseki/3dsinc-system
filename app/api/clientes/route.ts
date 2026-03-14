import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaCriarCliente = z.object({
  nome: z.string().min(1, 'Nome obrigatorio'),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  empresa: z.string().optional().nullable(),
  cpfCnpj: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('busca')

    const clientes = await prisma.cliente.findMany({
      where: busca
        ? {
            OR: [
              { nome: { contains: busca, mode: 'insensitive' } },
              { empresa: { contains: busca, mode: 'insensitive' } },
              { email: { contains: busca, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { nome: 'asc' },
      take: 50,
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
