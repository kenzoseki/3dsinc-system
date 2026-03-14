import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' }
})

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/api/pedidos/:path*', '/api/filamentos/:path*', '/api/ia/:path*']
}
