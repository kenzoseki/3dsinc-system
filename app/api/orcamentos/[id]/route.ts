import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaItem = z.object({
  id:             z.string().optional(),
  ordem:          z.number().int().default(0),
  descricao:      z.string().min(1),
  detalhamento:   z.string().optional().nullable(),
  quantidade:     z.number().int().min(1).default(1),
  valorUnitario:  z.number().min(0),
  imagensBase64:  z.array(z.string()).optional().default([]),
})

const schemaAtualizar = z.object({
  numero:              z.number().int().optional(),
  revisao:             z.number().int().optional(),
  clienteNome:         z.string().min(1).optional(),
  clienteEmpresa:      z.string().optional().nullable(),
  clienteCnpj:         z.string().optional().nullable(),
  clienteEmail:        z.string().optional().nullable(),
  clienteTelefone:     z.string().optional().nullable(),
  clienteEndereco:     z.string().optional().nullable(),
  clienteCep:          z.string().optional().nullable(),
  clienteResponsavel:  z.string().optional().nullable(),
  clienteCodInterno:   z.string().optional().nullable(),
  dataEmissao:         z.string().optional(),
  validadeDias:        z.number().int().optional(),
  orcamentista:        z.string().optional().nullable(),
  cidade:              z.string().optional().nullable(),
  condicoesTecnicas:   z.string().optional().nullable(),
  condicoesComerciais: z.string().optional().nullable(),
  notas:               z.string().optional().nullable(),
  frete:               z.number().optional().nullable(),
  aliquotaImposto:     z.number().optional().nullable(),
  bonusPercentual:     z.number().optional().nullable(),
  status:              z.enum(['RASCUNHO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'EXPIRADO']).optional(),
  itens:               z.array(schemaItem).optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: { itens: { orderBy: { ordem: 'asc' }, include: { imagens: true } } },
    })
    if (!orcamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

    return NextResponse.json(orcamento)
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (['VISUALIZADOR'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const { itens, dataEmissao, frete, aliquotaImposto, bonusPercentual, ...resto } = validacao.data

    const orcamento = await prisma.$transaction(async (tx) => {
      if (itens !== undefined) {
        await tx.itemOrcamento.deleteMany({ where: { orcamentoId: id } })
      }

      return tx.orcamento.update({
        where: { id },
        data: {
          ...resto,
          ...(dataEmissao ? { dataEmissao: new Date(dataEmissao) } : {}),
          ...(frete !== undefined ? { frete } : {}),
          ...(aliquotaImposto !== undefined ? { aliquotaImposto } : {}),
          ...(bonusPercentual !== undefined ? { bonusPercentual } : {}),
          ...(itens !== undefined ? {
            itens: {
              create: itens.map((item, i) => ({
                ordem:         item.ordem ?? i,
                descricao:     item.descricao,
                detalhamento:  item.detalhamento,
                quantidade:    item.quantidade,
                valorUnitario: item.valorUnitario,
                imagens: {
                  create: (item.imagensBase64 ?? []).map((b64, j) => ({
                    imagemBase64: b64,
                    nomeArquivo:  `imagem-${j + 1}`,
                  })),
                },
              })),
            },
          } : {}),
        },
        include: { itens: { orderBy: { ordem: 'asc' }, include: { imagens: true } } },
      })
    })

    return NextResponse.json(orcamento)
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (!['ADMIN', 'SOCIO', 'GERENTE'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    await prisma.orcamento.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
