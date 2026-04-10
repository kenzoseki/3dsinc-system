import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET — serve o arquivo como proxy.
// Blob Store é private → URL direta dá 403. Fazemos fetch server-side
// com o BLOB_READ_WRITE_TOKEN e retornamos o conteúdo ao client.
// Para arquivos legados (base64 no Postgres), decodifica e serve.
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; arquivoId: string }> }
) {
  try {
    const { id: pedidoId, arquivoId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const arquivo = await prisma.arquivoPedido.findFirst({
      where: { id: arquivoId, pedidoId },
    })
    if (!arquivo) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

    // Sanitiza nome e tipo para headers seguros
    const nomeSanitizado = arquivo.nome.replace(/["\r\n]/g, '_')
    const tipoSanitizado = /^[\w-]+\/[\w.+\-]+$/.test(arquivo.tipo)
      ? arquivo.tipo
      : 'application/octet-stream'

    // Caminho novo: arquivo no Vercel Blob → proxy server-side (private store)
    if (arquivo.blobUrl) {
      const token = process.env.BLOB_READ_WRITE_TOKEN
      if (!token) {
        return NextResponse.json({ erro: 'BLOB_READ_WRITE_TOKEN não configurado' }, { status: 500 })
      }

      const blobRes = await fetch(arquivo.blobUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!blobRes.ok) {
        console.error('[arquivos] Erro fetch blob:', blobRes.status, arquivo.blobUrl)
        return NextResponse.json({ erro: 'Erro ao buscar arquivo' }, { status: 502 })
      }

      const body = blobRes.body
      return new NextResponse(body, {
        headers: {
          'Content-Type': tipoSanitizado,
          'Content-Disposition': `inline; filename="${nomeSanitizado}"`,
          ...(blobRes.headers.get('content-length')
            ? { 'Content-Length': blobRes.headers.get('content-length')! }
            : {}),
        },
      })
    }

    // Caminho legado: arquivo em base64 no Postgres
    if (!arquivo.conteudoBase64) {
      return NextResponse.json({ erro: 'Conteúdo indisponível' }, { status: 404 })
    }

    const base64 = arquivo.conteudoBase64.includes(',')
      ? arquivo.conteudoBase64.split(',')[1]
      : arquivo.conteudoBase64
    const buffer = Buffer.from(base64, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': tipoSanitizado,
        'Content-Disposition': `attachment; filename="${nomeSanitizado}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
