import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schemaAtualizarPerfil = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100).optional(),
  telefone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().max(700_000).optional().nullable(), // aceita URL ou base64 (≤500KB)
})

const schemaAlterarSenha = z.object({
  senhaAtual: z.string().min(1, 'Senha atual obrigatória'),
  novaSenha: z.string().min(8, 'Nova senha deve ter ao menos 8 caracteres').max(128),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, nome: true, email: true, cargo: true, telefone: true, avatarUrl: true },
    })
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(usuario)
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { acao } = body

    if (acao !== undefined && acao !== 'alterarSenha') {
      return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
    }

    if (acao === 'alterarSenha') {
      const validacao = schemaAlterarSenha.safeParse(body)
      if (!validacao.success) {
        return NextResponse.json(
          { erro: 'Dados inválidos', detalhes: validacao.error.flatten() },
          { status: 400 }
        )
      }

      const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id } })
      if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

      const senhaCorreta = await bcrypt.compare(validacao.data.senhaAtual, usuario.senha)
      if (!senhaCorreta) {
        return NextResponse.json({ erro: 'Senha atual incorreta' }, { status: 400 })
      }

      const novaSenhaHash = await bcrypt.hash(validacao.data.novaSenha, 12)
      await prisma.usuario.update({
        where: { id: session.user.id },
        data: { senha: novaSenhaHash },
      })

      return NextResponse.json({ mensagem: 'Senha alterada com sucesso' })
    }

    // Atualizar dados do perfil
    const validacao = schemaAtualizarPerfil.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const usuario = await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        ...(validacao.data.nome && { nome: validacao.data.nome }),
        telefone: validacao.data.telefone ?? null,
        avatarUrl: validacao.data.avatarUrl ?? null,
      },
      select: { id: true, nome: true, email: true, cargo: true, telefone: true, avatarUrl: true },
    })

    return NextResponse.json(usuario)
  } catch (erro) {
    console.error('Erro ao atualizar perfil:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
