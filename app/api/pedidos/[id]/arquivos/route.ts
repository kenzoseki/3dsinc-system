import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { del, put } from '@vercel/blob'
import { z } from 'zod'
import { obterUsoAtual, registrarUploadMensal } from '@/lib/blob-limits'

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

    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { id: true } })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const contentType = request.headers.get('content-type') ?? ''

    // ─── Upload via FormData (server-side put no Vercel Blob) ─────────
    // Esta é a rota padrão: o cliente envia o arquivo como FormData,
    // o servidor faz o `put()` direto (sem o client SDK do @vercel/blob,
    // que estava abortando em dev). Limite de 30 MB via
    // proxyClientMaxBodySize no next.config.
    if (contentType.startsWith('multipart/form-data')) {
      // Bloqueio em 50% do free tier
      const uso = await obterUsoAtual()
      if (uso.bloqueado) {
        return NextResponse.json({ erro: uso.motivoBloqueio ?? 'Limite de uso atingido' }, { status: 413 })
      }

      const formData = await request.formData()
      const file = formData.get('file')
      const itemWorkspaceId = (formData.get('itemWorkspaceId') as string) || null

      if (!(file instanceof File)) {
        return NextResponse.json({ erro: 'Arquivo ausente no FormData (campo "file")' }, { status: 400 })
      }
      if (file.size === 0) {
        return NextResponse.json({ erro: 'Arquivo vazio' }, { status: 400 })
      }
      if (file.size > 30 * 1024 * 1024) {
        return NextResponse.json({ erro: 'Arquivo muito grande (máx. 30 MB)' }, { status: 413 })
      }

      const safeName = file.name.replace(/[^\w.\- ]/g, '_').slice(0, 200)
      const pathname = itemWorkspaceId
        ? `pedidos/${id}/itens/${itemWorkspaceId}/${safeName}`
        : `pedidos/${id}/${safeName}`

      const blob = await put(pathname, file, {
        access: 'private',
        addRandomSuffix: true,
        contentType: file.type || 'application/octet-stream',
      })

      const arquivoCriado = await prisma.arquivoPedido.create({
        data: {
          pedidoId: id,
          nome: file.name,
          tipo: file.type || 'application/octet-stream',
          tamanhoBytes: file.size,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          itemWorkspaceId: itemWorkspaceId ?? null,
        },
        select: { id: true, nome: true, tipo: true, tamanhoBytes: true, blobUrl: true, itemWorkspaceId: true, createdAt: true },
      })

      registrarUploadMensal(file.size).catch(err =>
        console.error('Erro registrando uso mensal:', err)
      )

      return NextResponse.json(arquivoCriado, { status: 201 })
    }

    // ─── Registro de upload já feito (fluxo legado: client SDK) ─────────
    const body = await request.json()
    const parsed = schemaRegistrar.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 400 })
    }
    const { nome, tipo, tamanhoBytes, blobUrl, blobPathname, itemWorkspaceId } = parsed.data

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
