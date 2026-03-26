import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaAtualizar = z.object({
  status: z.enum(['PENDENTE', 'EM_ANALISE', 'IMPLEMENTADO', 'DESCARTADO']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    if (!['ADMIN', 'SOCIO'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    }

    const sugestao = await prisma.sugestao.update({
      where: { id },
      data: { status: validacao.data.status },
    })

    return NextResponse.json(sugestao)
  } catch (erro) {
    console.error('Erro ao atualizar sugestão:', erro)
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
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    await prisma.sugestao.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (erro) {
    console.error('Erro ao excluir sugestão:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
