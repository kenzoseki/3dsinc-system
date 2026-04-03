import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo, EtapaWorkspace } from '@prisma/client'

const schemaItem = z.object({
  id:           z.string().optional(),
  descricao:    z.string().min(1).max(500),
  referencia:   z.string().max(500).optional().nullable(),
  quantidade:   z.number().int().positive().default(1),
  valorUnitario: z.number().positive().optional().nullable(),
})

const schemaAtualizar = z.object({
  clienteNome:     z.string().min(1).max(200).optional(),
  clienteEmail:    z.string().email().optional().nullable(),
  clienteTelefone: z.string().max(30).optional().nullable(),
  tipoPessoa:      z.enum(['PF', 'PJ']).optional().nullable(),
  infoAdicional:   z.string().max(2000).optional().nullable(),
  observacoes:     z.string().max(2000).optional().nullable(),
  etapa:           z.nativeEnum(EtapaWorkspace).optional(),
  itens:           z.array(schemaItem).optional(),
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
    const solicitacao = await prisma.workspace.findUnique({
      where: { id },
      include: { itens: { orderBy: { createdAt: 'asc' } } },
    })

    if (!solicitacao) {
      return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    }

    return NextResponse.json(solicitacao)
  } catch (erro) {
    console.error('Erro ao buscar workspace:', erro)
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
    if (!Permissoes.podeEscreverPedidos(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para editar solicitações' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const dados = validacao.data

    const atualizado = await prisma.$transaction(async (tx) => {
      if (dados.itens !== undefined) {
        // Substituir todos os itens
        await tx.itemWorkspace.deleteMany({ where: { workspaceId: id } })
        if (dados.itens.length > 0) {
          await tx.itemWorkspace.createMany({
            data: dados.itens.map(item => ({
              workspaceId: id,
              descricao: item.descricao,
              referencia: item.referencia ?? null,
              quantidade: item.quantidade,
              valorUnitario: item.valorUnitario ?? null,
            })),
          })
        }
      }

      return tx.workspace.update({
        where: { id },
        data: {
          ...(dados.clienteNome     !== undefined && { clienteNome: dados.clienteNome }),
          ...(dados.clienteEmail    !== undefined && { clienteEmail: dados.clienteEmail }),
          ...(dados.clienteTelefone !== undefined && { clienteTelefone: dados.clienteTelefone }),
          ...(dados.tipoPessoa      !== undefined && { tipoPessoa: dados.tipoPessoa }),
          ...(dados.infoAdicional   !== undefined && { infoAdicional: dados.infoAdicional }),
          ...(dados.observacoes     !== undefined && { observacoes: dados.observacoes }),
          ...(dados.etapa           !== undefined && { etapa: dados.etapa }),
        },
        include: { itens: { orderBy: { createdAt: 'asc' } } },
      })
    })

    return NextResponse.json(atualizado)
  } catch (erro) {
    console.error('Erro ao atualizar workspace:', erro)
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
    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Somente ADMIN pode excluir' }, { status: 403 })
    }

    const { id } = await params
    await prisma.$transaction([
      prisma.itemWorkspace.deleteMany({ where: { workspaceId: id } }),
      prisma.workspace.delete({ where: { id } }),
    ])

    return NextResponse.json({ mensagem: 'Excluído com sucesso' })
  } catch (erro) {
    console.error('Erro ao excluir workspace:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
