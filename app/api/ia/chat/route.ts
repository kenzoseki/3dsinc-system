import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic } from '@/lib/claude'
import { getERPContext } from '@/lib/erp-context'
import { Permissoes } from '@/lib/permissoes'
import { z } from 'zod'
import { Cargo } from '@prisma/client'

// Schema de validacao para mensagens do chat
const schemaMensagem = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const schemaChat = z.object({
  messages: z.array(schemaMensagem).min(1, 'Pelo menos uma mensagem e necessaria'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 })
    }

    if (!Permissoes.podeUsarIA(session.user.cargo as Cargo)) {
      return NextResponse.json({ erro: 'Sem permissao para usar o assistente IA' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = schemaChat.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados invalidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const { messages } = validacao.data

    // Buscar contexto dinamico do ERP
    const erpContext = await getERPContext()

    const resposta = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Voce e o assistente IA da 3D Sinc, empresa de impressao 3D por encomenda.
Voce tem acesso em tempo real ao ERP. Use os dados abaixo para responder com precisao.
Seja objetivo e profissional. Sempre em portugues brasileiro.
Quando identificar problemas (atrasos, estoque critico), proponha acoes concretas.

${erpContext}`,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })

    return NextResponse.json(resposta)
  } catch (erro) {
    console.error('Erro ao chamar IA:', erro)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
