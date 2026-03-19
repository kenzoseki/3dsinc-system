import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { Cargo } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          throw new Error('Email e senha são obrigatórios')
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
        })

        if (!usuario || !usuario.ativo) {
          throw new Error('Usuário não encontrado ou inativo')
        }

        const senhaValida = await bcrypt.compare(credentials.senha, usuario.senha)

        if (!senhaValida) {
          throw new Error('Senha incorreta')
        }

        return {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo as Cargo,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.nome = (user as { nome: string }).nome
        token.cargo = (user as { cargo: Cargo }).cargo
        // avatarUrl não é armazenado no JWT para evitar cookie grande demais
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.nome = token.nome as string
        // Re-busca cargo do banco para refletir alterações em tempo real
        try {
          const usuario = await prisma.usuario.findUnique({
            where: { id: token.id as string },
            select: { cargo: true, nome: true, ativo: true },
          })
          if (usuario && usuario.ativo) {
            session.user.cargo = usuario.cargo as Cargo
            session.user.nome = usuario.nome
          } else if (usuario && !usuario.ativo) {
            // Usuário desativado — sessão será invalidada
            session.user.cargo = 'VISUALIZADOR' as Cargo
          } else {
            session.user.cargo = token.cargo as Cargo
          }
        } catch {
          session.user.cargo = token.cargo as Cargo
        }
        session.user.avatarUrl = null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
