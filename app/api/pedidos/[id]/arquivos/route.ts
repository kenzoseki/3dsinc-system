import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schemaUpload = z.object({
  nome:           z.string().min(1),
  tipo:           z.string().min(1),
  tamanhoBytes:   z.number().int().positive(),
  conteudoBase64: z.string().min(1),
})

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const arquivos = await prisma.arquivoPedido.findMany({
    where: { pedidoId: id },
    select: { id: true, nome: true, tipo: true, tamanhoBytes: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(arquivos)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo === 'VISUALIZADOR') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const validacao = schemaUpload.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    if (validacao.data.tamanhoBytes > MAX_BYTES) {
      return NextResponse.json({ erro: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 413 })
    }

    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { id: true } })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const arquivo = await prisma.arquivoPedido.create({
      data: {
        pedidoId:       id,
        nome:           validacao.data.nome,
        tipo:           validacao.data.tipo,
        tamanhoBytes:   validacao.data.tamanhoBytes,
        conteudoBase64: validacao.data.conteudoBase64,
      },
      select: { id: true, nome: true, tipo: true, tamanhoBytes: true, createdAt: true },
    })

    return NextResponse.json(arquivo, { status: 201 })
  } catch (erro) {
    console.error('Erro ao fazer upload:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pedidoId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (session.user.cargo === 'VISUALIZADOR') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const arquivoId = searchParams.get('arquivoId')
    if (!arquivoId) return NextResponse.json({ erro: 'arquivoId obrigatório' }, { status: 400 })

    await prisma.arquivoPedido.deleteMany({ where: { id: arquivoId, pedidoId } })
    return new NextResponse(null, { status: 204 })
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
