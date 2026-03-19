import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import LoginForm from './LoginForm'

const buscarDadosLogin = unstable_cache(
  async () => {
    const config = await prisma.configuracaoEmpresa.findUnique({
      where: { id: 'empresa' },
      select: { logoBase64: true, nomeEmpresa: true },
    })
    return {
      logoBase64: config?.logoBase64 ?? null,
      nomeEmpresa: config?.nomeEmpresa ?? '3D Sinc',
    }
  },
  ['login-dados'],
  { revalidate: 300 }
)

export default async function LoginPage() {
  const { logoBase64, nomeEmpresa } = await buscarDadosLogin()

  return <LoginForm logoBase64={logoBase64} nomeEmpresa={nomeEmpresa} />
}
