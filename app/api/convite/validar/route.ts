import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ erro: 'Token nao informado' }, { status: 400 })
    }

    const convite = await prisma.convite.findUnique({
      where: { token },
    })

    if (!convite) {
      return NextResponse.json({ erro: 'Convite invalido' }, { status: 404 })
    }

    if (convite.usado) {
      return NextResponse.json({ erro: 'Convite ja foi utilizado' }, { status: 400 })
    }

    if (convite.expiresAt < new Date()) {
      return NextResponse.json({ erro: 'Convite expirado' }, { status: 400 })
    }

    return NextResponse.json({
      email: convite.email,
      cargo: convite.cargo,
      expiresAt: convite.expiresAt,
    })
  } catch (erro) {
    console.error('Erro ao validar convite:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
