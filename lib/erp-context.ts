import { prisma } from './db'

export async function getERPContext(): Promise<string> {
  const [pedidos, filamentos, alertas] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: { in: ['APROVADO', 'EM_PRODUCAO', 'PAUSADO'] } },
      include: { cliente: true, itens: true },
      orderBy: { prazoEntrega: 'asc' },
      take: 50,
    }),
    prisma.filamento.findMany({
      where: { ativo: true },
      orderBy: { pesoAtual: 'asc' },
    }),
    prisma.alertaEstoque.findMany({
      where: { lido: false },
      include: { filamento: true },
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
}
