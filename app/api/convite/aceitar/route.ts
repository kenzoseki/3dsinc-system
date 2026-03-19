import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Schema de validacao para aceite de convite
const schemaAceitarConvite = z.object({
  token: z.string().min(1, 'Token obrigatorio'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  avatarUrl: z.string().url().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validacao = schemaAceitarConvite.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const { token, nome, senha, avatarUrl } = validacao.data

    // Buscar e validar o convite
    const convite = await prisma.convite.findUnique({ where: { token } })

    // Mensagem unificada para evitar enumeração de estado do convite
    const erroConvite = NextResponse.json({ erro: 'Convite inválido, expirado ou já utilizado' }, { status: 400 })

    if (!convite) return erroConvite
    if (convite.usado) return erroConvite
    if (convite.expiresAt < new Date()) return erroConvite

    // Verificar se email ja foi cadastrado
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email: convite.email } })
    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Email ja cadastrado no sistema' },
        { status: 400 }
      )
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    // Criar usuario e marcar convite como usado em transacao
    const usuario = await prisma.$transaction(async (tx) => {
      const novoUsuario = await tx.usuario.create({
        data: {
          nome,
          email: convite.email,
          senha: senhaHash,
          cargo: convite.cargo,
          avatarUrl: avatarUrl ?? null,
          primeiroAcesso: false,
        },
      })

      await tx.convite.update({
        where: { token },
        data: { usado: true },
      })

      return novoUsuario
    })

    return NextResponse.json({
      mensagem: 'Conta criada com sucesso',
      email: usuario.email,
    }, { status: 201 })
  } catch (erro) {
    console.error('Erro ao aceitar convite:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
