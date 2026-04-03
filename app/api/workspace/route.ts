import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo, EtapaWorkspace } from '@prisma/client'

const schemaItem = z.object({
  descricao:    z.string().min(1).max(500),
  referencia:   z.string().max(500).optional().nullable(),
  quantidade:   z.number().int().positive().default(1),
  valorUnitario: z.number().positive().optional().nullable(),
})

const schemaCriar = z.object({
  clienteNome:     z.string().min(1, 'Nome do cliente obrigatório').max(200),
  clienteEmail:    z.string().email().optional().nullable(),
  clienteTelefone: z.string().max(30).optional().nullable(),
  tipoPessoa:      z.enum(['PF', 'PJ']).optional().nullable(),
  observacoes:     z.string().max(2000).optional().nullable(),
  itens:           z.array(schemaItem).optional().default([]),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const etapa = searchParams.get('etapa') as EtapaWorkspace | null

    const solicitacoes = await prisma.workspace.findMany({
      where: etapa ? { etapa } : undefined,
      include: {
        itens: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(solicitacoes)
  } catch (erro) {
    console.error('Erro ao listar workspace:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (!Permissoes.podeEscreverPedidos(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para criar solicitações' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const dados = validacao.data

    const solicitacao = await prisma.workspace.create({
      data: {
        clienteNome:     dados.clienteNome,
        clienteEmail:    dados.clienteEmail ?? null,
        clienteTelefone: dados.clienteTelefone ?? null,
        tipoPessoa:      dados.tipoPessoa ?? null,
        observacoes:     dados.observacoes ?? null,
        itens: dados.itens.length > 0 ? {
          create: dados.itens.map(item => ({
            descricao:    item.descricao,
            referencia:   item.referencia ?? null,
            quantidade:   item.quantidade,
            valorUnitario: item.valorUnitario ?? null,
          })),
        } : undefined,
      },
      include: { itens: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json(solicitacao, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar solicitação:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
