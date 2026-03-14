import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { Cargo } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    if (!Permissoes.podeVerEquipe(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const membros = await prisma.usuario.findMany({
      orderBy: [{ ativo: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true, nome: true, email: true, cargo: true,
        ativo: true, avatarUrl: true, telefone: true, createdAt: true,
      },
    })

    return NextResponse.json(membros)
  } catch (erro) {
    console.error('Erro ao listar equipe:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
