import { Cargo } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      nome: string
      email: string
      cargo: Cargo
      avatarUrl?: string | null
    }
  }

  interface User {
    id: string
    nome: string
    email: string
    cargo: Cargo
    avatarUrl?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nome: string
    cargo: Cargo
    avatarUrl?: string | null
  }
}
