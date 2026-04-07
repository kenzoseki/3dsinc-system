import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaCriar = z.object({
  titulo:         z.string().min(1, 'Título obrigatório').max(200),
  descricao:      z.string().max(2000).optional().nullable(),
  etapa:          z.enum(['IDEIA', 'PLANEJAMENTO', 'PRODUCAO', 'REVISAO', 'AGENDADO', 'PUBLICADO']).optional().default('IDEIA'),
  plataforma:     z.string().max(100).optional().nullable(),
  responsavel:    z.string().max(200).optional().nullable(),
  dataPublicacao: z.string().optional().nullable(),
  imagemBase64:   z.string().max(7_000_000).optional().nullable(),
  observacoes:    z.string().max(2000).optional().nullable(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const cards = await prisma.cardMarketing.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(cards)
  } catch (erro) {
    console.error('Erro ao listar marketing:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const dados = validacao.data
    const card = await prisma.cardMarketing.create({
      data: {
        titulo:         dados.titulo,
        descricao:      dados.descricao ?? null,
        etapa:          dados.etapa ?? 'IDEIA',
        plataforma:     dados.plataforma ?? null,
        responsavel:    dados.responsavel ?? null,
        dataPublicacao: dados.dataPublicacao ? new Date(dados.dataPublicacao.length <= 10 ? dados.dataPublicacao + 'T12:00:00' : dados.dataPublicacao) : null,
        imagemBase64:   dados.imagemBase64 ?? null,
        observacoes:    dados.observacoes ?? null,
      },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar card marketing:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
