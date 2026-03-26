import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaCriar = z.object({
  tipo: z.enum(['MELHORIA', 'BUG']),
  titulo: z.string().min(1, 'Título obrigatório').max(200),
  descricao: z.string().min(1, 'Descrição obrigatória').max(2000),
  imagemBase64: z.string().max(5_300_000).optional().nullable(), // ~4MB imagem
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Apenas ADMIN e SOCIO podem listar todas as sugestões
    if (!['ADMIN', 'SOCIO'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const sugestoes = await prisma.sugestao.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: {
          select: { nome: true, cargo: true },
        },
      },
    })

    return NextResponse.json(sugestoes)
  } catch (erro) {
    console.error('Erro ao listar sugestões:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const validacao = schemaCriar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const sugestao = await prisma.sugestao.create({
      data: {
        tipo: validacao.data.tipo,
        titulo: validacao.data.titulo,
        descricao: validacao.data.descricao,
        imagemBase64: validacao.data.imagemBase64 ?? null,
        usuarioId: session.user.id,
      },
    })

    return NextResponse.json(sugestao, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar sugestão:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
