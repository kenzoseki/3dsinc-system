import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { del } from '@vercel/blob'
import { z } from 'zod'
import { registrarUploadMensal } from '@/lib/blob-limits'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const arquivos = await prisma.arquivoPedido.findMany({
    where: { pedidoId: id },
    select: { id: true, nome: true, tipo: true, tamanhoBytes: true, blobUrl: true, itemWorkspaceId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(arquivos)
}

// Schema para registrar um upload já feito no Vercel Blob (Lote 16+)
const schemaRegistrar = z.object({
  nome:            z.string().min(1).max(255),
  tipo:            z.string().min(1).max(100),
  tamanhoBytes:    z.number().int().nonnegative(),
  blobUrl:         z.string().url(),
  blobPathname:    z.string().min(1).max(500),
  itemWorkspaceId: z.string().min(1).max(100).optional().nullable(),
})

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
    const parsed = schemaRegistrar.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 400 })
    }
    const { nome, tipo, tamanhoBytes, blobUrl, blobPathname, itemWorkspaceId } = parsed.data

    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { id: true } })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const arquivoCriado = await prisma.arquivoPedido.create({
      data: {
        pedidoId: id,
        nome,
        tipo,
        tamanhoBytes,
        blobUrl,
        blobPathname,
        itemWorkspaceId: itemWorkspaceId ?? null,
      },
      select: { id: true, nome: true, tipo: true, tamanhoBytes: true, blobUrl: true, itemWorkspaceId: true, createdAt: true },
    })

    // Atualiza contador mensal (best-effort, não bloqueia o response)
    registrarUploadMensal(tamanhoBytes).catch(err =>
      console.error('Erro registrando uso mensal:', err)
    )

    return NextResponse.json(arquivoCriado, { status: 201 })
  } catch (erro) {
    console.error('Erro ao registrar arquivo:', erro)
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

    const arquivo = await prisma.arquivoPedido.findFirst({
      where: { id: arquivoId, pedidoId },
      select: { blobUrl: true },
    })

    // Remove do Vercel Blob se for arquivo novo (não-legado)
    if (arquivo?.blobUrl) {
      try {
        await del(arquivo.blobUrl)
      } catch (err) {
        console.error('Erro deletando blob:', err)
        // Não bloqueia: se a remoção do blob falhar, ainda removemos do banco
      }
    }

    await prisma.arquivoPedido.deleteMany({ where: { id: arquivoId, pedidoId } })
    return new NextResponse(null, { status: 204 })
  } catch (erro) {
    console.error('Erro ao deletar arquivo:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
