import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rotas de API que NÃO exigem autenticação
const ROTAS_PUBLICAS_API = [
  '/api/auth',
  '/api/convite/validar',
  '/api/convite/aceitar',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Libera rotas públicas da API
  if (ROTAS_PUBLICAS_API.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Protege todas as rotas /api/* e /dashboard/*
  if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard/')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      // Para API, retorna JSON 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
      }
      // Para páginas, redireciona para login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
}
