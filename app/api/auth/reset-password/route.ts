import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHmac } from 'crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100),
})

function validarToken(token: string): { email: string; valido: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [email, expiraEmStr, hmac] = decoded.split(':')

    if (!email || !expiraEmStr || !hmac) return { email: '', valido: false }

    const expiraEm = parseInt(expiraEmStr, 10)
    if (Date.now() > expiraEm) return { email, valido: false }

    const payload = `${email}:${expiraEmStr}`
    const hmacEsperado = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? 'fallback')
      .update(payload)
      .digest('hex')

    if (hmac !== hmacEsperado) return { email: '', valido: false }

    return { email, valido: true }
  } catch {
    return { email: '', valido: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validacao = schema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: validacao.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const { token, senha } = validacao.data
    const { email, valido } = validarToken(token)

    if (!valido) {
      return NextResponse.json(
        { erro: 'Link expirado ou inválido. Solicite um novo link de redefinição.' },
        { status: 400 }
      )
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, ativo: true },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { erro: 'Usuário não encontrado ou inativo.' },
        { status: 400 }
      )
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: senhaHash },
    })

    return NextResponse.json({ mensagem: 'Senha redefinida com sucesso.' })
  } catch (erro) {
    console.error('Erro no reset-password:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
