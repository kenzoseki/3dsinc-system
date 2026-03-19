import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const config = await prisma.configuracaoEmpresa.findUnique({
      where: { id: 'empresa' },
      select: { logoBase64: true, nomeEmpresa: true },
    })
    return NextResponse.json({
      logoBase64: config?.logoBase64 ?? null,
      nomeEmpresa: config?.nomeEmpresa ?? '3D Sinc',
    })
  } catch {
    return NextResponse.json({ logoBase64: null, nomeEmpresa: '3D Sinc' })
  }
}
