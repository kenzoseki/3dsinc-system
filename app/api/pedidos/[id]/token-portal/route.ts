import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

// Gera ou regenera o token do portal para o pedido
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissão para gerar token do portal' }, { status: 403 })
    }

    const { id } = await params

    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { id: true } })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const token = randomBytes(24).toString('hex')

    await prisma.pedido.update({
      where: { id },
      data:  { tokenPortal: token },
    })

    return NextResponse.json({ token })
  } catch (erro) {
    console.error('Erro ao gerar token do portal:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
