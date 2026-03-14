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
          avatarUrl: usuario.avatarUrl,
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
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.nome = token.nome as string
        session.user.cargo = token.cargo as Cargo
        session.user.avatarUrl = token.avatarUrl as string | null | undefined
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
