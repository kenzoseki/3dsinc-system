import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rotas de API que NÃO exigem autenticação
const ROTAS_PUBLICAS_API = [
  '/api/auth',
  '/api/convite/validar',
  '/api/convite/aceitar',
  '/api/portal',
  '/api/public',
  // /api/blob/token aceita tanto chamadas do cliente (com sessão) quanto
  // webhooks do Vercel Blob (sem sessão, mas assinados pelo SDK).
  // Auth do cliente é feita dentro de onBeforeGenerateToken.
  '/api/blob/token',
]

// Tamanho máximo seguro do cookie de sessão (~8KB deixa margem para outros headers)
const COOKIE_SESSION_MAX_BYTES = 8192

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Libera rotas públicas da API
  if (ROTAS_PUBLICAS_API.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Detecta cookie de sessão corrompido/grande demais e limpa automaticamente
  const sessionCookie = request.cookies.get('next-auth.session-token')
    ?? request.cookies.get('__Secure-next-auth.session-token')
  if (sessionCookie && sessionCookie.value.length > COOKIE_SESSION_MAX_BYTES) {
    const loginUrl = new URL('/login', request.url)
    const resposta = NextResponse.redirect(loginUrl)
    resposta.cookies.delete('next-auth.session-token')
    resposta.cookies.delete('__Secure-next-auth.session-token')
    resposta.cookies.delete('next-auth.csrf-token')
    resposta.cookies.delete('__Host-next-auth.csrf-token')
    resposta.cookies.delete('next-auth.callback-url')
    return resposta
  }

  // Protege todas as rotas /api/*, /workspace/* e /home
  if (pathname.startsWith('/api/') || pathname.startsWith('/workspace/') || pathname === '/home') {
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
  matcher: ['/api/:path*', '/workspace/:path*', '/home'],
}
