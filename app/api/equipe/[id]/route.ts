import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Cargo } from '@prisma/client'

const schemaAtualizar = z.object({
  cargo: z.enum(['SOCIO', 'GERENTE', 'OPERADOR', 'VISUALIZADOR']).optional(),
  ativo: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Somente ADMIN pode gerenciar membros' }, { status: 403 })
    }

    const { id } = await params

    // Admin não pode alterar a si mesmo via esta rota
    if (id === session.user.id) {
      return NextResponse.json({ erro: 'Não é possível alterar seu próprio cargo aqui' }, { status: 400 })
    }

    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const alvo = await prisma.usuario.findUnique({ where: { id } })
    if (!alvo) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    // Não permite rebaixar outro ADMIN
    if (alvo.cargo === 'ADMIN' && validacao.data.cargo) {
      return NextResponse.json({ erro: 'Não é possível alterar cargo de outro ADMIN' }, { status: 403 })
    }

    const atualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(validacao.data.cargo && { cargo: validacao.data.cargo as Cargo }),
        ...(validacao.data.ativo !== undefined && { ativo: validacao.data.ativo }),
      },
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, createdAt: true },
    })

    return NextResponse.json(atualizado)
  } catch (erro) {
    console.error('Erro ao atualizar membro:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

const CARGOS_EXCLUIVEIS_POR_SOCIO: string[] = ['GERENTE', 'OPERADOR', 'VISUALIZADOR']

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const cargo = session.user.cargo as Cargo
    if (!['ADMIN', 'SOCIO'].includes(cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para excluir membros' }, { status: 403 })
    }

    const { id } = await params

    if (id === session.user.id) {
      return NextResponse.json({ erro: 'Não é possível excluir a si mesmo' }, { status: 400 })
    }

    const alvo = await prisma.usuario.findUnique({ where: { id } })
    if (!alvo) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    // ADMIN não pode excluir outro ADMIN
    if (alvo.cargo === 'ADMIN') {
      return NextResponse.json({ erro: 'Não é possível excluir um ADMIN' }, { status: 403 })
    }

    // SOCIO só pode excluir GERENTE, OPERADOR, VISUALIZADOR
    if (cargo === 'SOCIO' && !CARGOS_EXCLUIVEIS_POR_SOCIO.includes(alvo.cargo)) {
      return NextResponse.json({ erro: 'Sócio não pode excluir este cargo' }, { status: 403 })
    }

    await prisma.usuario.delete({ where: { id } })

    return NextResponse.json({ mensagem: 'Membro excluído com sucesso' })
  } catch (erro) {
    console.error('Erro ao excluir membro:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
