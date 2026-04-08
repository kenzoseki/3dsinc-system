import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Base64 de 10 MB = ceil(10*1024*1024/3)*4 ≈ 13.981.016 chars + prefixo data URL
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_BASE64_LEN = 14_500_000   // ~10 MB em base64 com margem para prefixo data URL

const schemaUpload = z.object({
  nome:           z.string().min(1).max(255),
  tipo:           z.string().min(1).max(100),
  tamanhoBytes:   z.number().int().positive(),
  conteudoBase64: z.string().min(1).max(MAX_BASE64_LEN, 'Arquivo muito grande. Máximo 10 MB.'),
})

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

    // Calcula tamanho real a partir do base64 (ignora campo informado pelo cliente)
    const base64 = validacao.data.conteudoBase64.includes(',')
      ? validacao.data.conteudoBase64.split(',')[1]
      : validacao.data.conteudoBase64
    const tamanhoReal = Math.floor((base64.length * 3) / 4)
    if (tamanhoReal > MAX_BYTES) {
      return NextResponse.json({ erro: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 413 })
    }

    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { id: true } })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const arquivo = await prisma.arquivoPedido.create({
      data: {
        pedidoId:       id,
        nome:           validacao.data.nome,
        tipo:           validacao.data.tipo,
        tamanhoBytes:   tamanhoReal,
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
