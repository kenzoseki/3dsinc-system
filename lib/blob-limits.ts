import { prisma } from '@/lib/db'

// Limites do plano Hobby do Vercel Blob (referência — sujeitos a mudança).
// https://vercel.com/docs/vercel-blob/usage-and-pricing
//
// Mantemos valores conservadores e bloqueamos a 50% para nunca chegar no
// limite real. Caso o Vercel mude os tetos, ajustar aqui.
export const HOBBY_LIMITS = {
  STORAGE_BYTES: 1 * 1024 * 1024 * 1024,        // 1 GB
  ADVANCED_OPS_MONTH: 10_000,                    // puts/list/head — usamos como teto de uploads/mês
} as const

export const BLOCK_THRESHOLD = 0.5 // bloqueia novos uploads ao atingir 50%

export interface UsoBlob {
  storageBytes: number
  storageLimite: number
  storagePercentual: number
  uploadsMes: number
  uploadsLimite: number
  uploadsPercentual: number
  bloqueado: boolean
  motivoBloqueio: string | null
}

function chaveMesAtual(): string {
  const agora = new Date()
  const ano = agora.getUTCFullYear()
  const mes = String(agora.getUTCMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export async function obterUsoAtual(): Promise<UsoBlob> {
  // Storage = soma de tamanhoBytes de todos arquivos com blobUrl (não-legados)
  const agg = await prisma.arquivoPedido.aggregate({
    _sum: { tamanhoBytes: true },
    where: { blobUrl: { not: null } },
  })
  const storageBytes = agg._sum.tamanhoBytes ?? 0

  // Uploads do mês atual
  const uso = await prisma.blobUsage.findUnique({ where: { yearMonth: chaveMesAtual() } })
  const uploadsMes = uso?.uploads ?? 0

  const storagePercentual = storageBytes / HOBBY_LIMITS.STORAGE_BYTES
  const uploadsPercentual = uploadsMes / HOBBY_LIMITS.ADVANCED_OPS_MONTH

  let bloqueado = false
  let motivoBloqueio: string | null = null
  if (storagePercentual >= BLOCK_THRESHOLD) {
    bloqueado = true
    motivoBloqueio = `Armazenamento atingiu ${Math.round(storagePercentual * 100)}% do limite mensal gratuito (${Math.round(BLOCK_THRESHOLD * 100)}% é o teto seguro). Aguarde o próximo ciclo ou faça upgrade do plano.`
  } else if (uploadsPercentual >= BLOCK_THRESHOLD) {
    bloqueado = true
    motivoBloqueio = `Uploads do mês atingiram ${Math.round(uploadsPercentual * 100)}% do limite gratuito. Aguarde o próximo ciclo ou faça upgrade do plano.`
  }

  return {
    storageBytes,
    storageLimite: HOBBY_LIMITS.STORAGE_BYTES,
    storagePercentual,
    uploadsMes,
    uploadsLimite: HOBBY_LIMITS.ADVANCED_OPS_MONTH,
    uploadsPercentual,
    bloqueado,
    motivoBloqueio,
  }
}

export async function registrarUploadMensal(bytes: number): Promise<void> {
  const ym = chaveMesAtual()
  await prisma.blobUsage.upsert({
    where: { yearMonth: ym },
    create: { yearMonth: ym, uploads: 1, bytesEnviados: BigInt(bytes) },
    update: {
      uploads:       { increment: 1 },
      bytesEnviados: { increment: BigInt(bytes) },
    },
  })
}
