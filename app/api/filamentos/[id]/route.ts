import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo } from '@prisma/client'

// Schema de validacao para atualizacao de filamento
const schemaAtualizarFilamento = z.object({
  marca: z.string().min(1).optional(),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PLA_PLUS', 'RESIN_STANDARD', 'RESIN_ABS_LIKE', 'NYLON', 'OUTRO']).optional(),
  cor: z.string().min(1).optional(),
  corHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  diametro: z.number().positive().optional(),
  pesoTotal: z.number().positive().optional(),
  pesoAtual: z.number().min(0).optional(),
  temperatura: z.number().int().positive().optional().nullable(),
  velocidade: z.number().int().positive().optional().nullable(),
  localizacao: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params

    const filamento = await prisma.filamento.findUnique({
      where: { id },
      include: {
        alertas: true,
        itensPedido: {
          include: { pedido: { include: { cliente: true } } },
        },
      },
    })

    if (!filamento) {
      return NextResponse.json({ erro: 'Filamento nao encontrado' }, { status: 404 })
    }

    return NextResponse.json(filamento)
  } catch (erro) {
    console.error('Erro ao buscar filamento:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    if (!Permissoes.podeEscreverEstoque(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissao para editar filamentos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizarFilamento.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const dados = validacao.data

    const filamento = await prisma.filamento.findUnique({ where: { id } })
    if (!filamento) {
      return NextResponse.json({ erro: 'Filamento nao encontrado' }, { status: 404 })
    }

    const filamentoAtualizado = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.filamento.update({
        where: { id },
        data: {
          ...(dados.marca && { marca: dados.marca }),
          ...(dados.material && { material: dados.material }),
          ...(dados.cor && { cor: dados.cor }),
          ...(dados.corHex !== undefined && { corHex: dados.corHex }),
          ...(dados.diametro && { diametro: dados.diametro }),
          ...(dados.pesoTotal && { pesoTotal: dados.pesoTotal }),
          ...(dados.pesoAtual !== undefined && { pesoAtual: dados.pesoAtual }),
          ...(dados.temperatura !== undefined && { temperatura: dados.temperatura }),
          ...(dados.velocidade !== undefined && { velocidade: dados.velocidade }),
          ...(dados.localizacao !== undefined && { localizacao: dados.localizacao }),
        },
      })

      // Verificar se o peso atual ficou abaixo de 20% do peso total
      const pesoAtualFinal = dados.pesoAtual ?? Number(filamento.pesoAtual)
      const pesoTotalFinal = dados.pesoTotal ?? Number(filamento.pesoTotal)
      const percentual = pesoAtualFinal / pesoTotalFinal

      if (percentual < 0.2) {
        // Verificar se ja existe alerta nao lido para este filamento
        const alertaExistente = await tx.alertaEstoque.findFirst({
          where: {
            filamentoId: id,
            lido: false,
            tipoAlerta: 'ESTOQUE_BAIXO',
          },
        })

        if (!alertaExistente) {
          await tx.alertaEstoque.create({
            data: {
              filamentoId: id,
              tipoAlerta: 'ESTOQUE_BAIXO',
            },
          })
        }
      }

      return atualizado
    })

    return NextResponse.json(filamentoAtualizado)
  } catch (erro) {
    console.error('Erro ao atualizar filamento:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    // Soft delete: somente ADMIN, SOCIO ou GERENTE podem desativar filamentos
    if (!(['ADMIN', 'SOCIO', 'GERENTE'] as Cargo[]).includes(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissao para remover filamentos' }, { status: 403 })
    }

    const { id } = await params

    const filamento = await prisma.filamento.findUnique({ where: { id } })
    if (!filamento) {
      return NextResponse.json({ erro: 'Filamento nao encontrado' }, { status: 404 })
    }

    // Soft delete — apenas marca como inativo
    await prisma.filamento.update({
      where: { id },
      data: { ativo: false },
    })

    return NextResponse.json({ mensagem: 'Filamento desativado com sucesso' })
  } catch (erro) {
    console.error('Erro ao desativar filamento:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
