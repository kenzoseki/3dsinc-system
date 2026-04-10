import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obterUsoAtual } from '@/lib/blob-limits'

export async function POST(request: Request): Promise<NextResponse> {
  // Sanity check: sem o token o handleUpload retorna 500 e o cliente fica
  // tentando 10x com backoff, parecendo "carregando infinito".
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[blob/token] BLOB_READ_WRITE_TOKEN não configurado')
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN não configurado no servidor. Configure a variável no .env (dev) ou na Vercel (produção).' },
      { status: 500 },
    )
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Auth obrigatória
        const session = await getServerSession(authOptions)
        if (!session?.user) {
          throw new Error('Não autenticado')
        }
        if (session.user.cargo === 'VISUALIZADOR') {
          throw new Error('Sem permissão para upload')
        }

        // Bloqueio em 50% do free tier do Vercel Blob
        const uso = await obterUsoAtual()
        if (uso.bloqueado) {
          throw new Error(uso.motivoBloqueio ?? 'Limite de uso atingido')
        }

        return {
          allowedContentTypes: [
            // Modelos 3D
            'model/stl',
            'model/obj',
            'model/3mf',
            'application/octet-stream', // STL às vezes vem como octet-stream
            // G-code
            'text/x-gcode',
            'text/plain',
            // Imagens
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            // Documentos
            'application/pdf',
            'application/zip',
          ],
          addRandomSuffix: true,
          // tokenPayload é serializado e devolvido em onUploadCompleted
          tokenPayload: JSON.stringify({ usuarioId: session.user.id }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Webhook do Vercel — chamado em produção após o upload terminar.
        // Em dev (localhost) não dispara. Por isso, registramos também via
        // POST /api/pedidos/[id]/arquivos no client após o upload.
        // Aqui só logamos (ou no futuro, podemos atualizar contadores como
        // backup caso o registro client-side falhe).
        console.log('Vercel Blob upload completed:', blob.pathname, tokenPayload)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
