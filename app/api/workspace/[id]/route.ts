import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo, EtapaWorkspace } from '@prisma/client'

const schemaItem = z.object({
  id:            z.string().optional(),
  descricao:     z.string().min(1).max(500),
  referencia:    z.string().max(500).optional().nullable(),
  quantidade:    z.coerce.number().int().positive().default(1),
  valorUnitario: z.coerce.number().nonnegative().optional().nullable(),
  custoUnitario: z.coerce.number().nonnegative().optional().nullable(),
})

const schemaAtualizar = z.object({
  clienteNome:     z.string().min(1).max(200).optional(),
  clienteEmail:    z.string().email().optional().nullable(),
  clienteTelefone: z.string().max(30).optional().nullable(),
  tipoPessoa:      z.enum(['PF', 'PJ']).optional().nullable(),
  infoAdicional:   z.string().max(2000).optional().nullable(),
  observacoes:     z.string().max(2000).optional().nullable(),
  etapa:           z.nativeEnum(EtapaWorkspace).optional(),
  pacoteAltura:      z.coerce.number().nonnegative().optional().nullable(),
  pacoteLargura:     z.coerce.number().nonnegative().optional().nullable(),
  pacoteComprimento: z.coerce.number().nonnegative().optional().nullable(),
  pacotePeso:        z.coerce.number().nonnegative().optional().nullable(),
  frete:           z.number().nonnegative().optional().nullable(),
  dataEnvio:       z.string().optional().nullable(),
  horaEnvio:       z.string().max(10).optional().nullable(),
  codigoRastreio:  z.string().max(200).optional().nullable(),
  prioridade:      z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  dataEntrega:     z.string().optional().nullable(),
  itens:           z.array(schemaItem).max(100).optional(),
})

// Mapeamento Workspace etapa → Pedido status
const ETAPA_PARA_STATUS: Record<string, string> = {
  SOLICITACAO:       'ORCAMENTO',
  CUSTO_VIABILIDADE: 'ORCAMENTO',
  APROVACAO:         'APROVADO',
  PRODUCAO:          'EM_PRODUCAO',
  CALCULO_FRETE:     'CONCLUIDO',
  ENVIADO:           'ENTREGUE',
  FINALIZADO:        'ENTREGUE',
  CANCELADO:         'CANCELADO',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params
    const solicitacao = await prisma.workspace.findUnique({
      where: { id },
      include: { itens: { orderBy: { createdAt: 'asc' } } },
    })

    if (!solicitacao) {
      return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    }

    return NextResponse.json(solicitacao)
  } catch (erro) {
    console.error('Erro ao buscar workspace:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (!Permissoes.podeEscreverPedidos(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissão para editar solicitações' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizar.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const dados = validacao.data

    // Buscar workspace atual para validações de transição
    const wsAtual = await prisma.workspace.findUnique({
      where: { id },
      include: { itens: true },
    })
    if (!wsAtual) {
      return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    }

    // Validações de transição de etapa
    if (dados.etapa) {
      // CUSTO_VIABILIDADE → APROVACAO: todos itens devem ter valorUnitario
      if (wsAtual.etapa === 'CUSTO_VIABILIDADE' && dados.etapa === 'APROVACAO') {
        const itensParaValidar = dados.itens ?? wsAtual.itens
        const semValor = itensParaValidar.some(i => !i.valorUnitario || Number(i.valorUnitario) <= 0)
        if (semValor) {
          return NextResponse.json({ erro: 'Todos os itens devem ter valor unitário antes de avançar para Aprovação' }, { status: 422 })
        }
      }
      // CALCULO_FRETE → ENVIADO: frete deve estar preenchido
      if (wsAtual.etapa === 'CALCULO_FRETE' && dados.etapa === 'ENVIADO') {
        const freteValor = dados.frete ?? (wsAtual.frete ? Number(wsAtual.frete) : null)
        if (freteValor === null || freteValor === undefined) {
          return NextResponse.json({ erro: 'Frete deve ser informado antes de avançar para Enviado' }, { status: 422 })
        }
      }
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      // Substituir itens se fornecidos
      if (dados.itens !== undefined) {
        await tx.itemWorkspace.deleteMany({ where: { workspaceId: id } })
        if (dados.itens.length > 0) {
          await tx.itemWorkspace.createMany({
            data: dados.itens.map(item => ({
              workspaceId: id,
              descricao: item.descricao,
              referencia: item.referencia ?? null,
              quantidade: item.quantidade,
              valorUnitario: item.valorUnitario ?? null,
              custoUnitario: item.custoUnitario ?? null,
            })),
          })
        }
      }

      // Dados extras para timestamps automáticos de produção
      const dadosExtras: Record<string, unknown> = {}
      if (dados.etapa) {
        // Ao entrar em PRODUCAO: set dataInicioProducao
        if (dados.etapa === 'PRODUCAO' && wsAtual.etapa !== 'PRODUCAO') {
          dadosExtras.dataInicioProducao = new Date()
        }
        // Ao sair de PRODUCAO → CALCULO_FRETE: set dataFimProducao
        if (dados.etapa === 'CALCULO_FRETE' && wsAtual.etapa === 'PRODUCAO') {
          dadosExtras.dataFimProducao = new Date()
        }
      }

      const ws = await tx.workspace.update({
        where: { id },
        data: {
          ...(dados.clienteNome     !== undefined && { clienteNome: dados.clienteNome }),
          ...(dados.clienteEmail    !== undefined && { clienteEmail: dados.clienteEmail }),
          ...(dados.clienteTelefone !== undefined && { clienteTelefone: dados.clienteTelefone }),
          ...(dados.tipoPessoa      !== undefined && { tipoPessoa: dados.tipoPessoa }),
          ...(dados.infoAdicional   !== undefined && { infoAdicional: dados.infoAdicional }),
          ...(dados.observacoes     !== undefined && { observacoes: dados.observacoes }),
          ...(dados.etapa           !== undefined && { etapa: dados.etapa }),
          ...(dados.pacoteAltura      !== undefined && { pacoteAltura: dados.pacoteAltura }),
          ...(dados.pacoteLargura     !== undefined && { pacoteLargura: dados.pacoteLargura }),
          ...(dados.pacoteComprimento !== undefined && { pacoteComprimento: dados.pacoteComprimento }),
          ...(dados.pacotePeso        !== undefined && { pacotePeso: dados.pacotePeso }),
          ...(dados.frete           !== undefined && { frete: dados.frete }),
          ...(dados.dataEnvio       !== undefined && { dataEnvio: dados.dataEnvio ? new Date(dados.dataEnvio) : null }),
          ...(dados.horaEnvio       !== undefined && { horaEnvio: dados.horaEnvio }),
          ...(dados.codigoRastreio  !== undefined && { codigoRastreio: dados.codigoRastreio }),
          ...(dados.prioridade     !== undefined && { prioridade: dados.prioridade }),
          ...(dados.dataEntrega    !== undefined && { dataEntrega: dados.dataEntrega ? new Date(dados.dataEntrega) : null }),
          ...dadosExtras,
        },
        include: { itens: { orderBy: { createdAt: 'asc' } } },
      })

      // Sync etapa → status do Pedido vinculado
      if (dados.etapa && ws.pedidoId) {
        const novoStatus = ETAPA_PARA_STATUS[dados.etapa]
        if (novoStatus) {
          await tx.pedido.update({
            where: { id: ws.pedidoId },
            data: { status: novoStatus as never },
          })
        }
      }

      // Sync etapa → status do Orçamento vinculado
      if (dados.etapa && ws.orcamentoId) {
        const ETAPA_PARA_STATUS_ORC: Record<string, string> = {
          SOLICITACAO:       'RASCUNHO',
          CUSTO_VIABILIDADE: 'ENVIADO',
          APROVACAO:         'ENVIADO',
          PRODUCAO:          'APROVADO',
          CALCULO_FRETE:     'APROVADO',
          ENVIADO:           'APROVADO',
          FINALIZADO:        'APROVADO',
          CANCELADO:         'REPROVADO',
        }
        const novoStatusOrc = ETAPA_PARA_STATUS_ORC[dados.etapa]
        if (novoStatusOrc) {
          await tx.orcamento.update({
            where: { id: ws.orcamentoId },
            data: { status: novoStatusOrc as never },
          })
        }
      }

      // Sync itens/valores para Orçamento vinculado
      if (ws.orcamentoId && (dados.itens !== undefined || dados.frete !== undefined)) {
        if (dados.itens !== undefined) {
          await tx.itemOrcamento.deleteMany({ where: { orcamentoId: ws.orcamentoId } })
          if (dados.itens.length > 0) {
            const itensOrcamento = await Promise.all(
              dados.itens.map((item, idx) =>
                tx.itemOrcamento.create({
                  data: {
                    orcamentoId: ws.orcamentoId!,
                    ordem: idx,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    valorUnitario: item.valorUnitario ?? 0,
                  },
                })
              )
            )

            // Sync imagens: copiar ArquivoPedido (imagens) → ImagemItemOrcamento
            if (ws.pedidoId && itensOrcamento.length > 0) {
              const arquivosImagem = await tx.arquivoPedido.findMany({
                where: { pedidoId: ws.pedidoId, tipo: { startsWith: 'image/' } },
                select: { nome: true, conteudoBase64: true },
              })
              if (arquivosImagem.length > 0) {
                // Distribui imagens entre os itens (round-robin)
                await tx.imagemItemOrcamento.createMany({
                  data: arquivosImagem.map((arq, i) => ({
                    itemOrcamentoId: itensOrcamento[i % itensOrcamento.length].id,
                    imagemBase64: arq.conteudoBase64,
                    nomeArquivo: arq.nome,
                  })),
                })
              }
            }
          }
        }
        if (dados.frete !== undefined) {
          await tx.orcamento.update({
            where: { id: ws.orcamentoId },
            data: { frete: dados.frete },
          })
        }
      }

      return ws
    })

    return NextResponse.json(atualizado)
  } catch (erro) {
    console.error('Erro ao atualizar workspace:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Somente ADMIN pode excluir' }, { status: 403 })
    }

    const { id } = await params

    // Buscar workspace para limpar vínculos
    const ws = await prisma.workspace.findUnique({
      where: { id },
      select: { pedidoId: true, orcamentoId: true },
    })
    if (!ws) {
      return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Limpar vínculo do Pedido (nullificar pedidoId, não deletar o pedido)
      if (ws.pedidoId) {
        await tx.pedido.update({
          where: { id: ws.pedidoId },
          data: { orcamentoId: null },
        })
      }
      await tx.itemWorkspace.deleteMany({ where: { workspaceId: id } })
      await tx.workspace.delete({ where: { id } })
    })

    return NextResponse.json({ mensagem: 'Excluído com sucesso' })
  } catch (erro) {
    console.error('Erro ao excluir workspace:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
