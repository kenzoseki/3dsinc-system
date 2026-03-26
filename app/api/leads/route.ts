import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaCriar = z.object({
  nome:        z.string().min(1).max(120),
  empresa:     z.string().max(120).optional().nullable(),
  email:       z.string().email().optional().nullable(),
  telefone:    z.string().max(30).optional().nullable(),
  etapa:       z.enum(['PROSPECTO', 'NEGOCIACAO', 'FECHADO', 'PERDIDO']).optional(),
  valor:       z.number().min(0).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  responsavel: z.string().max(80).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const etapa = searchParams.get('etapa')

    const leads = await prisma.lead.findMany({
      where: etapa ? { etapa: etapa as import('@prisma/client').EtapaLead } : {},
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(leads)
  } catch (erro) {
    console.error('Erro ao listar leads:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo === 'VISUALIZADOR') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const dados = validacao.data
    const lead = await prisma.$transaction(async (tx) => {
      const novoLead = await tx.lead.create({ data: dados })

      // Sincronizar Lead → Cliente
      if (dados.nome) {
        const dadosCliente = {
          nome: dados.nome,
          email: dados.email ?? null,
          telefone: dados.telefone ?? null,
          empresa: dados.empresa ?? null,
        }
        // Não temos CPF/CNPJ no Lead, então busca por nome exato para evitar duplicatas
        const existente = await tx.cliente.findFirst({
          where: { nome: dados.nome },
        })
        if (existente) {
          await tx.cliente.update({
            where: { id: existente.id },
            data: {
              email: dados.email ?? existente.email,
              telefone: dados.telefone ?? existente.telefone,
              empresa: dados.empresa ?? existente.empresa,
            },
          })
        } else {
          await tx.cliente.create({ data: dadosCliente })
        }
      }

      return novoLead
    })
    return NextResponse.json(lead, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar lead:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
