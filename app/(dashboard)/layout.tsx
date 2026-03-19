import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LayoutShell from './LayoutShell'

export default async function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  const config = await prisma.configuracaoEmpresa.findUnique({
    where: { id: 'empresa' },
    select: { logoBase64: true },
  })

  return (
    <LayoutShell session={session} logoEmpresa={config?.logoBase64 ?? null}>
      {children}
    </LayoutShell>
  )
}
