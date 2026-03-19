import { unstable_cache } from 'next/cache'
import { prisma } from './db'

export const getERPContext = unstable_cache(
  async (): Promise<string> => {
    const [pedidos, filamentos, alertas] = await Promise.all([
      prisma.pedido.findMany({
        where: { status: { in: ['APROVADO', 'AGUARDANDO', 'EM_PRODUCAO', 'PAUSADO'] } },
        select: {
          numero: true,
          status: true,
          prazoEntrega: true,
          cliente: { select: { nome: true } },
        },
        orderBy: { prazoEntrega: 'asc' },
        take: 50,
      }),
      prisma.filamento.findMany({
        where: { ativo: true },
        select: { marca: true, material: true, cor: true, pesoAtual: true, pesoTotal: true },
        orderBy: { pesoAtual: 'asc' },
      }),
      prisma.alertaEstoque.findMany({
        where: { lido: false },
        select: {
          tipoAlerta: true,
          filamento: { select: { marca: true, cor: true } },
        },
      }),
    ])

    return `
=== DADOS ERP 3D SINC (tempo real) ===
PEDIDOS ATIVOS: ${pedidos.length}
${pedidos.map(p =>
  `- #${p.numero} | ${p.cliente.nome} | ${p.status} | Prazo: ${p.prazoEntrega?.toLocaleDateString('pt-BR') ?? 'Sem prazo'}`
).join('\n')}

ESTOQUE FILAMENTOS:
${filamentos.map(f =>
  `- ${f.marca} ${f.material} ${f.cor} | ${f.pesoAtual}g de ${f.pesoTotal}g`
).join('\n')}

ALERTAS NAO LIDOS: ${alertas.length}
${alertas.map(a => `- ${a.tipoAlerta}: ${a.filamento.marca} ${a.filamento.cor}`).join('\n')}
  `
  },
  ['erp-context'],
  { revalidate: 30 }
)
