import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaAtualizar = z.object({
  titulo:         z.string().min(1).max(200).optional(),
  descricao:      z.string().max(2000).optional().nullable(),
  etapa:          z.enum(['IDEIA', 'PLANEJAMENTO', 'PRODUCAO', 'REVISAO', 'AGENDADO', 'PUBLICADO']).optional(),
  plataforma:     z.string().max(100).optional().nullable(),
  responsavel:    z.string().max(200).optional().nullable(),
  dataPublicacao: z.string().optional().nullable(),
  imagemBase64:   z.string().max(7_000_000).optional().nullable(),
  observacoes:    z.string().max(2000).optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params
    const card = await prisma.cardMarketing.findUnique({ where: { id } })
    if (!card) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

    return NextResponse.json(card)
  } catch (erro) {
    console.error('Erro ao buscar card marketing:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const dados = validacao.data
    const card = await prisma.cardMarketing.update({
      where: { id },
      data: {
        ...(dados.titulo         !== undefined && { titulo: dados.titulo }),
        ...(dados.descricao      !== undefined && { descricao: dados.descricao }),
        ...(dados.etapa          !== undefined && { etapa: dados.etapa }),
        ...(dados.plataforma     !== undefined && { plataforma: dados.plataforma }),
        ...(dados.responsavel    !== undefined && { responsavel: dados.responsavel }),
        ...(dados.dataPublicacao !== undefined && { dataPublicacao: dados.dataPublicacao ? new Date(dados.dataPublicacao) : null }),
        ...(dados.imagemBase64   !== undefined && { imagemBase64: dados.imagemBase64 }),
        ...(dados.observacoes    !== undefined && { observacoes: dados.observacoes }),
      },
    })

    return NextResponse.json(card)
  } catch (erro) {
    console.error('Erro ao atualizar card marketing:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (!['ADMIN', 'SOCIO'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para excluir' }, { status: 403 })
    }

    const { id } = await params
    await prisma.cardMarketing.delete({ where: { id } })

    return NextResponse.json({ mensagem: 'Excluído com sucesso' })
  } catch (erro) {
    console.error('Erro ao excluir card marketing:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
