/**
 * Script de limpeza de dados — Pedidos, Orçamentos e Estoque
 * Executar com: npx tsx scripts/limpar-dados.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function limpar() {
  console.log('Iniciando limpeza de dados...\n')

  // Ordem de deleção respeitando FKs
  const etapas = [
    { nome: 'HistoricoPedido', fn: () => prisma.historicoPedido.deleteMany() },
    { nome: 'ItemPedido', fn: () => prisma.itemPedido.deleteMany() },
    { nome: 'ArquivoPedido', fn: () => prisma.arquivoPedido.deleteMany() },
    { nome: 'ImagemItemOrcamento', fn: () => prisma.imagemItemOrcamento.deleteMany() },
    { nome: 'ItemOrcamento', fn: () => prisma.itemOrcamento.deleteMany() },
    { nome: 'ItemWorkspace', fn: () => prisma.itemWorkspace.deleteMany() },
    { nome: 'Workspace', fn: () => prisma.workspace.deleteMany() },
    { nome: 'Pedido', fn: () => prisma.pedido.deleteMany() },
    { nome: 'Orcamento', fn: () => prisma.orcamento.deleteMany() },
    { nome: 'AlertaEstoque', fn: () => prisma.alertaEstoque.deleteMany() },
    { nome: 'Filamento', fn: () => prisma.filamento.deleteMany() },
  ]

  for (const etapa of etapas) {
    const resultado = await etapa.fn()
    console.log(`  ✓ ${etapa.nome}: ${resultado.count} registros removidos`)
  }

  console.log('\nLimpeza concluída com sucesso!')
}

limpar()
  .catch((e) => {
    console.error('Erro na limpeza:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
