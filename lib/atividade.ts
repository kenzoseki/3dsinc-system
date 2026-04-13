import { prisma } from './db'

export type AcaoAtividade =
  | 'criou'
  | 'atualizou'
  | 'aprovou'
  | 'reprovou'
  | 'excluiu'
  | 'moveu'
  | 'cancelou'
  | 'finalizou'
  | 'enviou'
  | 'comentou'
  | 'anexou'

export type EntidadeAtividade =
  | 'Pedido'
  | 'Orcamento'
  | 'Workspace'
  | 'Cliente'
  | 'Lead'
  | 'CardMarketing'
  | 'Filamento'

export async function registrarAtividade(params: {
  usuarioId?: string | null
  acao: AcaoAtividade
  entidade: EntidadeAtividade
  entidadeId?: string | null
  titulo: string
  descricao?: string | null
}) {
  try {
    await prisma.atividadeLog.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId ?? null,
        titulo: params.titulo,
        descricao: params.descricao ?? null,
      },
    })
  } catch (erro) {
    // Atividade log nunca deve quebrar a operação principal
    console.error('Erro ao registrar atividade:', erro)
  }
}
