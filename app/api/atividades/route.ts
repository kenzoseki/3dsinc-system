import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limite = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limite') ?? '50') || 50))
    const soNaoLidas = url.searchParams.get('naoLidas') === 'true'

    const atividades = await prisma.atividadeLog.findMany({
      where: soNaoLidas ? { lida: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        usuario: { select: { id: true, nome: true, avatarUrl: true } },
      },
    })

    const total = await prisma.atividadeLog.count()
    const naoLidas = await prisma.atividadeLog.count({ where: { lida: false } })

    return NextResponse.json({ atividades, total, naoLidas })
  } catch (erro) {
    console.error('Erro ao buscar atividades:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// Marcar todas como lidas
export async function PATCH(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    await prisma.atividadeLog.updateMany({
      where: { lida: false },
      data: { lida: true },
    })

    return NextResponse.json({ ok: true })
  } catch (erro) {
    console.error('Erro ao marcar atividades:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
