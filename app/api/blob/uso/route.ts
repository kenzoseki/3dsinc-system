import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obterUsoAtual } from '@/lib/blob-limits'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const uso = await obterUsoAtual()
  return NextResponse.json(uso)
}
