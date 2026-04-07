import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Rota pública — sem autenticação — acessada pelo cliente via link
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const pedido = await prisma.pedido.findUnique({
      where: { tokenPortal: token },
      select: {
        numero:      true,
        descricao:   true,
        status:      true,
        prazoEntrega: true,
        createdAt:   true,
        updatedAt:   true,
        tokenPortalExpira: true,
        cliente: { select: { nome: true, empresa: true } },
        itens: {
          select: {
            descricao:  true,
            quantidade: true,
          },
        },
        historico: {
          select: { status: true, nota: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!pedido) {
      return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 404 })
    }

    // Verificar expiração do token
    if (pedido.tokenPortalExpira && new Date() > pedido.tokenPortalExpira) {
      return NextResponse.json({ erro: 'Link expirado. Solicite um novo ao fornecedor.' }, { status: 410 })
    }

    return NextResponse.json(pedido)
  } catch (erro) {
    console.error('Erro no portal:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
