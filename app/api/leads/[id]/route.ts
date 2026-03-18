import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaAtualizar = z.object({
  nome:        z.string().min(1).max(120).optional(),
  empresa:     z.string().max(120).optional().nullable(),
  email:       z.string().email().optional().nullable(),
  telefone:    z.string().max(30).optional().nullable(),
  etapa:       z.enum(['PROSPECTO', 'NEGOCIACAO', 'FECHADO', 'PERDIDO']).optional(),
  valor:       z.number().min(0).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  responsavel: z.string().max(80).optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { id } = await params
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ erro: 'Lead não encontrado' }, { status: 404 })

    return NextResponse.json(lead)
  } catch (erro) {
    console.error('Erro ao buscar lead:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const lead = await prisma.lead.update({
      where: { id },
      data:  validacao.data,
    })

    return NextResponse.json(lead)
  } catch (erro: unknown) {
    if ((erro as { code?: string }).code === 'P2025') {
      return NextResponse.json({ erro: 'Lead não encontrado' }, { status: 404 })
    }
    console.error('Erro ao atualizar lead:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
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
    await prisma.lead.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (erro: unknown) {
    if ((erro as { code?: string }).code === 'P2025') {
      return NextResponse.json({ erro: 'Lead não encontrado' }, { status: 404 })
    }
    console.error('Erro ao deletar lead:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
