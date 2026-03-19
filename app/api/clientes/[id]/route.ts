import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaEditarCliente = z.object({
  nome: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  empresa: z.string().max(200).optional().nullable(),
  cpfCnpj: z.string().max(30).optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        pedidos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            numero: true,
            descricao: true,
            status: true,
            prioridade: true,
            valorTotal: true,
            prazoEntrega: true,
            createdAt: true,
          },
        },
      },
    })

    if (!cliente) {
      return NextResponse.json({ erro: 'Cliente nao encontrado' }, { status: 404 })
    }

    return NextResponse.json(cliente)
  } catch (erro) {
    console.error('Erro ao buscar cliente:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissao para editar clientes' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaEditarCliente.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: validacao.data,
    })

    return NextResponse.json(cliente)
  } catch (erro: unknown) {
    if (
      typeof erro === 'object' &&
      erro !== null &&
      'code' in erro &&
      (erro as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ erro: 'Cliente nao encontrado' }, { status: 404 })
    }
    console.error('Erro ao editar cliente:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }
    if (session.user.cargo === 'VISUALIZADOR' || session.user.cargo === 'OPERADOR') {
      return NextResponse.json({ erro: 'Sem permissao para excluir clientes' }, { status: 403 })
    }

    const { id } = await params

    const totalPedidos = await prisma.pedido.count({ where: { clienteId: id } })
    if (totalPedidos > 0) {
      return NextResponse.json(
        { erro: `Nao e possivel excluir: cliente possui ${totalPedidos} pedido(s) vinculado(s)` },
        { status: 409 }
      )
    }

    await prisma.cliente.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (erro: unknown) {
    if (
      typeof erro === 'object' &&
      erro !== null &&
      'code' in erro &&
      (erro as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ erro: 'Cliente nao encontrado' }, { status: 404 })
    }
    console.error('Erro ao excluir cliente:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
