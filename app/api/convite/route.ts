import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema de validacao para criacao de convite
const schemaCriarConvite = z.object({
  email: z.string().email('Email invalido'),
  cargo: z.enum(['GERENTE', 'OPERADOR', 'VISUALIZADOR']),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    // Somente ADMIN pode gerar convites
    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Somente ADMIN pode gerar convites' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaCriarConvite.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const { email, cargo } = validacao.data

    // Verificar se usuario com esse email ja existe
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } })
    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Ja existe um usuario cadastrado com esse email' },
        { status: 400 }
      )
    }

    // Invalidar convites anteriores para o mesmo email
    await prisma.convite.updateMany({
      where: { email, usado: false },
      data: { usado: true },
    })

    // Criar novo convite com validade de 7 dias
    const convite = await prisma.convite.create({
      data: {
        email,
        cargo,
        enviadoPor: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const linkConvite = `${process.env.NEXTAUTH_URL}/primeiro-acesso?token=${convite.token}`

    return NextResponse.json({
      token: convite.token,
      link: linkConvite,
      expiresAt: convite.expiresAt,
    }, { status: 201 })
  } catch (erro) {
    console.error('Erro ao criar convite:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
