import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo } from '@prisma/client'

// Schema de validacao para criacao de filamento
const schemaCriarFilamento = z.object({
  marca: z.string().min(1, 'Marca obrigatoria'),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PLA_PLUS', 'RESIN_STANDARD', 'RESIN_ABS_LIKE', 'NYLON', 'OUTRO']),
  cor: z.string().min(1, 'Cor obrigatoria'),
  corHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  diametro: z.number().positive('Diametro deve ser positivo'),
  pesoTotal: z.number().positive('Peso total deve ser positivo'),
  pesoAtual: z.number().min(0, 'Peso atual nao pode ser negativo'),
  temperatura: z.number().int().positive().optional().nullable(),
  velocidade: z.number().int().positive().optional().nullable(),
  localizacao: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const incluirInativos = searchParams.get('incluirInativos') === 'true'

    const filamentos = await prisma.filamento.findMany({
      where: incluirInativos ? {} : { ativo: true },
      include: {
        alertas: {
          where: { lido: false },
        },
      },
      orderBy: { marca: 'asc' },
    })

    return NextResponse.json(filamentos)
  } catch (erro) {
    console.error('Erro ao listar filamentos:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    if (!Permissoes.podeEscreverEstoque(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissao para cadastrar filamentos' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriarFilamento.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const dados = validacao.data

    const filamento = await prisma.filamento.create({
      data: {
        marca: dados.marca,
        material: dados.material,
        cor: dados.cor,
        corHex: dados.corHex ?? null,
        diametro: dados.diametro,
        pesoTotal: dados.pesoTotal,
        pesoAtual: dados.pesoAtual,
        temperatura: dados.temperatura ?? null,
        velocidade: dados.velocidade ?? null,
        localizacao: dados.localizacao ?? null,
      },
    })

    return NextResponse.json(filamento, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar filamento:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
