import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const senha = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where: { email: 'admin@3dsinc.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@3dsinc.com.br',
      senha,
      cargo: 'ADMIN',
      primeiroAcesso: false,
    }
  })
  console.log('Seed concluido: admin@3dsinc.com.br / admin123')
}

main().finally(() => prisma.$disconnect())
