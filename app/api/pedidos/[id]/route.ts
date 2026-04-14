import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Permissoes } from '@/lib/permissoes'
import { registrarAtividade, AcaoAtividade } from '@/lib/atividade'
import { z } from 'zod'
import { Cargo, StatusPedido } from '@prisma/client'

// Schema de validacao para atualizacao de pedido
const schemaAtualizarPedido = z.object({
  descricao:    z.string().min(1).optional(),
  prioridade:   z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  status:       z.enum(['ORCAMENTO', 'APROVADO', 'AGUARDANDO', 'EM_PRODUCAO', 'PAUSADO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO']).optional(),
  prazoEntrega: z.string().datetime().optional().nullable(),
  valorTotal:   z.number().positive().optional().nullable(),
  observacoes:  z.string().optional().nullable(),
  arquivo3d:    z.string().optional().nullable(),
  orcamentoId:  z.string().optional().nullable(),
  notaStatus:   z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        orcamento: { select: { id: true, numero: true, revisao: true, status: true } },
        itens: {
          select: {
            id: true, filamentoId: true, descricao: true, quantidade: true,
            pesoGramas: true, tempoHoras: true, valorUnitario: true,
            filamento: { select: { marca: true, cor: true, material: true } },
          },
        },
        historico: {
          select: {
            id: true, status: true, nota: true, createdAt: true,
            usuario: { select: { nome: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        arquivos: { select: { id: true, nome: true, tipo: true, tamanhoBytes: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        workspace: { select: { id: true, numero: true, etapa: true, dataEntrega: true, dataInicioProducao: true, dataFimProducao: true, frete: true, codigoRastreio: true, dataEnvio: true, horaEnvio: true, infoAdicional: true, tipoPessoa: true } },
      },
    })

    if (!pedido) {
      return NextResponse.json({ erro: 'Pedido nao encontrado' }, { status: 404 })
    }

    return NextResponse.json(pedido)
  } catch (erro) {
    console.error('Erro ao buscar pedido:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    if (!Permissoes.podeEscreverPedidos(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissao para editar pedidos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validacao = schemaAtualizarPedido.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const dados = validacao.data

    // Buscar pedido atual para verificar mudanca de status
    const pedidoAtual = await prisma.pedido.findUnique({
      where: { id },
      include: { orcamento: { select: { status: true } } },
    })
    if (!pedidoAtual) {
      return NextResponse.json({ erro: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Validar transição para APROVADO: orçamento vinculado deve estar APROVADO
    if (dados.status === 'APROVADO' && pedidoAtual.orcamentoId) {
      if (pedidoAtual.orcamento?.status !== 'APROVADO') {
        return NextResponse.json(
          { erro: 'O orçamento vinculado precisa estar APROVADO antes de aprovar este pedido.' },
          { status: 422 }
        )
      }
    }

    const pedidoAtualizado = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.pedido.update({
        where: { id },
        data: {
          ...(dados.descricao && { descricao: dados.descricao }),
          ...(dados.prioridade && { prioridade: dados.prioridade }),
          ...(dados.status && { status: dados.status }),
          ...(dados.prazoEntrega !== undefined && { prazoEntrega: dados.prazoEntrega ? new Date(dados.prazoEntrega) : null }),
          ...(dados.valorTotal !== undefined && { valorTotal: dados.valorTotal }),
          ...(dados.observacoes !== undefined && { observacoes: dados.observacoes }),
          ...(dados.arquivo3d !== undefined && { arquivo3d: dados.arquivo3d }),
          ...(dados.orcamentoId !== undefined && { orcamentoId: dados.orcamentoId }),
        },
        include: {
          cliente: { select: { id: true, nome: true, email: true, telefone: true } },
          orcamento: { select: { id: true, numero: true, revisao: true, status: true } },
          itens: {
            select: {
              id: true, filamentoId: true, descricao: true, quantidade: true,
              pesoGramas: true, tempoHoras: true, valorUnitario: true,
              filamento: { select: { marca: true, cor: true, material: true } },
            },
          },
          historico: {
            select: {
              id: true, status: true, nota: true, createdAt: true,
              usuario: { select: { nome: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          arquivos: { select: { id: true, nome: true, tipo: true, tamanhoBytes: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        },
      })

      // Se o status mudou, criar registro no historico
      if (dados.status && dados.status !== pedidoAtual.status) {
        await tx.historicoPedido.create({
          data: {
            pedidoId: id,
            usuarioId: session.user.id,
            status: dados.status as StatusPedido,
            nota: dados.notaStatus ?? `Status alterado para ${dados.status}`,
          },
        })
      }

      return atualizado
    })

    if (dados.status && dados.status !== pedidoAtual.status) {
      const acaoMap: Record<string, AcaoAtividade> = {
        APROVADO: 'aprovou',
        CANCELADO: 'cancelou',
        ENTREGUE: 'finalizou',
        CONCLUIDO: 'finalizou',
      }
      await registrarAtividade({
        usuarioId: session.user.id,
        acao: acaoMap[dados.status] ?? 'moveu',
        entidade: 'Pedido',
        entidadeId: pedidoAtualizado.id,
        titulo: `Pedido #${pedidoAtualizado.numero} — ${pedidoAtualizado.cliente.nome}`,
        descricao: `Status: ${pedidoAtual.status} → ${dados.status}`,
      })
    }

    return NextResponse.json(pedidoAtualizado)
  } catch (erro) {
    console.error('Erro ao atualizar pedido:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    if (!['ADMIN', 'SOCIO'].includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Somente ADMIN ou SOCIO pode deletar pedidos' }, { status: 403 })
    }

    const { id } = await params

    const pedido = await prisma.pedido.findUnique({ where: { id } })
    if (!pedido) {
      return NextResponse.json({ erro: 'Pedido nao encontrado' }, { status: 404 })
    }

    // Deletar em cascata
    await prisma.$transaction([
      prisma.historicoPedido.deleteMany({ where: { pedidoId: id } }),
      prisma.itemPedido.deleteMany({ where: { pedidoId: id } }),
      prisma.pedido.delete({ where: { id } }),
    ])

    await registrarAtividade({
      usuarioId: session.user.id,
      acao: 'excluiu',
      entidade: 'Pedido',
      entidadeId: null,
      titulo: `Pedido #${pedido.numero}`,
      descricao: 'Pedido excluído permanentemente',
    })

    return NextResponse.json({ mensagem: 'Pedido deletado com sucesso' })
  } catch (erro) {
    console.error('Erro ao deletar pedido:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
