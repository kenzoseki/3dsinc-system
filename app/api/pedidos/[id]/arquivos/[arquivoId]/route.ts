import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET — serve o arquivo. Para blobs novos (Vercel Blob) redireciona para o
// URL público; para arquivos legados (base64 no Postgres) decodifica e serve.
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

    // Caminho novo: arquivo no Vercel Blob → redireciona para URL público
    if (arquivo.blobUrl) {
      return NextResponse.redirect(arquivo.blobUrl, 302)
    }

    // Caminho legado: arquivo em base64 no Postgres
    if (!arquivo.conteudoBase64) {
      return NextResponse.json({ erro: 'Conteúdo indisponível' }, { status: 404 })
    }

    const base64 = arquivo.conteudoBase64.includes(',')
      ? arquivo.conteudoBase64.split(',')[1]
      : arquivo.conteudoBase64
    const buffer = Buffer.from(base64, 'base64')

    // Sanitiza nome para evitar header injection (remove aspas, quebras de linha e chars de controle)
    const nomeSanitizado = arquivo.nome.replace(/["\r\n]/g, '_')
    // Sanitiza Content-Type para aceitar apenas mime types válidos
    const tipoSanitizado = /^[\w-]+\/[\w.+\-]+$/.test(arquivo.tipo)
      ? arquivo.tipo
      : 'application/octet-stream'

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
