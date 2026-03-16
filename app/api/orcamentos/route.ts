import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaItem = z.object({
  ordem:          z.number().int().default(0),
  descricao:      z.string().min(1),
  detalhamento:   z.string().optional().nullable(),
  quantidade:     z.number().int().min(1).default(1),
  valorUnitario:  z.number().min(0),
  imagensBase64:  z.array(z.string()).optional().default([]),
})

const schemaCriar = z.object({
  clienteNome:         z.string().min(1),
  clienteEmpresa:      z.string().optional().nullable(),
  clienteCnpj:         z.string().optional().nullable(),
  clienteEmail:        z.string().optional().nullable(),
  clienteTelefone:     z.string().optional().nullable(),
  clienteEndereco:     z.string().optional().nullable(),
  clienteCep:          z.string().optional().nullable(),
  clienteResponsavel:  z.string().optional().nullable(),
  clienteCodInterno:   z.string().optional().nullable(),
  dataEmissao:         z.string().optional(),
  validadeDias:        z.number().int().default(5),
  orcamentista:        z.string().optional().nullable(),
  cidade:              z.string().optional().nullable(),
  condicoesTecnicas:   z.string().optional().nullable(),
  condicoesComerciais: z.string().optional().nullable(),
  notas:               z.string().optional().nullable(),
  frete:               z.number().optional().nullable(),
  aliquotaImposto:     z.number().optional().nullable(),
  bonusPercentual:     z.number().optional().nullable(),
  itens:               z.array(schemaItem).min(1),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const orcamentos = await prisma.orcamento.findMany({
      orderBy: { createdAt: 'desc' },
      include: { itens: { include: { imagens: true } } },
    })
    return NextResponse.json(orcamentos)
  } catch (erro) {
    console.error('Erro ao listar orçamentos:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (['VISUALIZADOR'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para criar orçamentos' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const { itens, dataEmissao, frete, aliquotaImposto, bonusPercentual, ...dadosOrcamento } = validacao.data

    const orcamento = await prisma.orcamento.create({
      data: {
        ...dadosOrcamento,
        dataEmissao:     dataEmissao ? new Date(dataEmissao) : new Date(),
        frete:           frete ?? null,
        aliquotaImposto: aliquotaImposto ?? null,
        bonusPercentual: bonusPercentual ?? null,
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
      },
      include: { itens: { include: { imagens: true } } },
    })

    return NextResponse.json(orcamento, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar orçamento:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
