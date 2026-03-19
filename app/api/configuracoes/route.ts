import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaAtualizar = z.object({
  nomeEmpresa:           z.string().min(1).max(100).optional(),
  cnpj:                  z.string().max(20).optional().nullable(),
  email:                 z.string().email().max(200).optional().nullable(),
  telefone:              z.string().max(30).optional().nullable(),
  endereco:              z.string().max(300).optional().nullable(),
  cidade:                z.string().max(100).optional().nullable(),
  estado:                z.string().max(2).optional().nullable(),
  logoBase64:            z.string().max(700_000).optional().nullable(), // ≈500KB
  alertaEstoqueBaixo:    z.boolean().optional(),
  alertaPedidoAtrasado:  z.boolean().optional(),
  alertaEmailHabilitado: z.boolean().optional(),
  emailAlertas:          z.string().email().max(200).optional().nullable(),
})

const configPadrao = {
  id: 'empresa', nomeEmpresa: '3D Sinc', cnpj: null, email: null,
  telefone: null, endereco: null, cidade: null, estado: null, logoBase64: null,
  alertaEstoqueBaixo: true, alertaPedidoAtrasado: true, alertaEmailHabilitado: false, emailAlertas: null,
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

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
