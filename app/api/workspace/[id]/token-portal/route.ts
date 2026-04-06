import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const ws = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, pedidoId: true },
    })
    if (!ws) return NextResponse.json({ erro: 'Workspace não encontrado' }, { status: 404 })

    const token = randomBytes(24).toString('hex')

    await prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id },
        data: { tokenPortal: token },
      })
      // Sync token para o pedido vinculado (portal de pedidos já funciona)
      if (ws.pedidoId) {
        await tx.pedido.update({
          where: { id: ws.pedidoId },
          data: { tokenPortal: token },
        })
      }
    })

    return NextResponse.json({ token })
  } catch (erro) {
    console.error('Erro ao gerar token do portal:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
