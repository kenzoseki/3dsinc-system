import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('@neondatabase/serverless')

function criarPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? criarPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
