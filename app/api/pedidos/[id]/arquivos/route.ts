import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    const contentType = request.headers.get('content-type') ?? ''

    let nome: string
    let tipo: string
    let tamanhoReal: number
    let conteudoBase64: string

    if (contentType.includes('multipart/form-data')) {
      // Upload via FormData (binário — sem overhead base64 no transporte)
      const formData = await request.formData()
      const arquivo = formData.get('arquivo') as File | null
      if (!arquivo || typeof arquivo === 'string') {
        return NextResponse.json({ erro: 'Campo "arquivo" obrigatório' }, { status: 400 })
      }

      nome = (formData.get('nome') as string) || arquivo.name
      tipo = (formData.get('tipo') as string) || arquivo.type || 'application/octet-stream'

      if (nome.length > 255) nome = nome.slice(0, 255)
      if (tipo.length > 100) tipo = tipo.slice(0, 100)

      const buffer = Buffer.from(await arquivo.arrayBuffer())
      tamanhoReal = buffer.length

      if (tamanhoReal > MAX_BYTES) {
        return NextResponse.json({ erro: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 413 })
      }

      conteudoBase64 = `data:${tipo};base64,${buffer.toString('base64')}`
    } else {
      // Fallback: upload via JSON com base64 (compatibilidade)
      const body = await request.json()
      if (!body.nome || !body.tipo || !body.conteudoBase64) {
        return NextResponse.json({ erro: 'Campos nome, tipo e conteudoBase64 obrigatórios' }, { status: 400 })
      }

      nome = String(body.nome).slice(0, 255)
      tipo = String(body.tipo).slice(0, 100)

      const base64Puro = body.conteudoBase64.includes(',')
        ? body.conteudoBase64.split(',')[1]
        : body.conteudoBase64
      tamanhoReal = Math.floor((base64Puro.length * 3) / 4)

      if (tamanhoReal > MAX_BYTES) {
        return NextResponse.json({ erro: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 413 })
      }

      conteudoBase64 = body.conteudoBase64
    }

    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { id: true } })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const arquivoCriado = await prisma.arquivoPedido.create({
      data: {
        pedidoId:       id,
        nome,
        tipo,
        tamanhoBytes:   tamanhoReal,
        conteudoBase64,
      },
      select: { id: true, nome: true, tipo: true, tamanhoBytes: true, createdAt: true },
    })

    return NextResponse.json(arquivoCriado, { status: 201 })
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
