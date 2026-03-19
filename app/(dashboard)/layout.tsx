import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LayoutShell from './LayoutShell'

const buscarLogo = unstable_cache(
  async () => {
    const config = await prisma.configuracaoEmpresa.findUnique({
      where: { id: 'empresa' },
      select: { logoBase64: true },
    })
    return config?.logoBase64 ?? null
  },
  ['layout-logo'],
  { revalidate: 300 } // 5 minutos
)

export default async function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const [session, logoBase64] = await Promise.all([
    getServerSession(authOptions),
    buscarLogo(),
  ])

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <LayoutShell session={session} logoEmpresa={logoBase64}>
      {children}
    </LayoutShell>
  )
}
