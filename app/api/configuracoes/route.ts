import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaAtualizar = z.object({
  nomeEmpresa:           z.string().min(1).optional(),
  cnpj:                  z.string().optional().nullable(),
  email:                 z.string().email().optional().nullable(),
  telefone:              z.string().optional().nullable(),
  endereco:              z.string().optional().nullable(),
  cidade:                z.string().optional().nullable(),
  estado:                z.string().optional().nullable(),
  logoBase64:            z.string().optional().nullable(),
  alertaEstoqueBaixo:    z.boolean().optional(),
  alertaPedidoAtrasado:  z.boolean().optional(),
  alertaEmailHabilitado: z.boolean().optional(),
})

const configPadrao = {
  id: 'empresa', nomeEmpresa: '3D Sinc', cnpj: null, email: null,
  telefone: null, endereco: null, cidade: null, estado: null, logoBase64: null,
  alertaEstoqueBaixo: true, alertaPedidoAtrasado: true, alertaEmailHabilitado: false,
}

export async function GET() {
  try {
    const config = await prisma.configuracaoEmpresa.findUnique({ where: { id: 'empresa' } })
    return NextResponse.json(config ?? configPadrao)
  } catch (erro) {
    console.error('Erro ao buscar configurações:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Somente ADMIN pode alterar configurações' }, { status: 403 })

    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const config = await prisma.configuracaoEmpresa.upsert({
      where: { id: 'empresa' },
      update: validacao.data,
      create: { id: 'empresa', ...validacao.data },
    })

    return NextResponse.json(config)
  } catch (erro) {
    console.error('Erro ao atualizar configurações:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
