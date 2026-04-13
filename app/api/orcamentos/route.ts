import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registrarAtividade } from '@/lib/atividade'
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
  itens:               z.array(schemaItem).min(1).max(100),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const paginado = searchParams.get('paginado') === 'true'
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10) || 1)
    const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') ?? '20', 10) || 20))
    const statusParam = searchParams.get('status')

    const where = statusParam ? { status: statusParam as import('@prisma/client').StatusOrcamento } : {}

    if (paginado) {
      const [orcamentos, total] = await Promise.all([
        prisma.orcamento.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pagina - 1) * limite,
          take: limite,
          include: { itens: { select: { valorUnitario: true, quantidade: true } } },
        }),
        prisma.orcamento.count({ where }),
      ])
      return NextResponse.json({
        orcamentos,
        paginacao: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
      })
    }

    // Modo compatibilidade — retorna array plano (sem imagens base64)
    const orcamentos = await prisma.orcamento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, numero: true, revisao: true, status: true,
        clienteNome: true, clienteEmpresa: true, dataEmissao: true, createdAt: true,
        frete: true, bonusPercentual: true,
        itens: { select: { valorUnitario: true, quantidade: true } },
      },
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

    const orcamento = await prisma.$transaction(async (tx) => {
      // Buscar último número e calcular próximo
      const ultimoOrc = await tx.orcamento.findFirst({
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      const proximoNumero = (ultimoOrc?.numero ?? 0) + 1

      const novoOrc = await tx.orcamento.create({
        data: {
          numero: proximoNumero,
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

      // Sincronizar cliente na tabela de Clientes
      if (dadosOrcamento.clienteNome) {
        const cpfCnpj = dadosOrcamento.clienteCnpj?.trim() || null
        if (cpfCnpj) {
          await tx.cliente.upsert({
            where: { cpfCnpj },
            update: {
              nome: dadosOrcamento.clienteNome,
              empresa: dadosOrcamento.clienteEmpresa ?? null,
              email: dadosOrcamento.clienteEmail ?? null,
              telefone: dadosOrcamento.clienteTelefone ?? null,
            },
            create: {
              nome: dadosOrcamento.clienteNome,
              empresa: dadosOrcamento.clienteEmpresa ?? null,
              cpfCnpj,
              email: dadosOrcamento.clienteEmail ?? null,
              telefone: dadosOrcamento.clienteTelefone ?? null,
            },
          })
        } else {
          // Sem CPF/CNPJ — criar se não existe um cliente com mesmo nome
          const existente = await tx.cliente.findFirst({
            where: { nome: dadosOrcamento.clienteNome },
          })
          if (!existente) {
            await tx.cliente.create({
              data: {
                nome: dadosOrcamento.clienteNome,
                empresa: dadosOrcamento.clienteEmpresa ?? null,
                email: dadosOrcamento.clienteEmail ?? null,
                telefone: dadosOrcamento.clienteTelefone ?? null,
              },
            })
          }
        }
      }

      return novoOrc
    })

    await registrarAtividade({
      usuarioId: session.user.id,
      acao: 'criou',
      entidade: 'Orcamento',
      entidadeId: orcamento.id,
      titulo: `ORC-${String(orcamento.numero).padStart(4, '0')} — ${orcamento.clienteNome}`,
      descricao: `Orçamento criado`,
    })

    return NextResponse.json(orcamento, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar orçamento:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
