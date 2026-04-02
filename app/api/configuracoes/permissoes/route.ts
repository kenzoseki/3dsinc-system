import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Valores de nível de permissão
const nivelSchema = z.enum(['total', 'leitura', 'nao'])

// Estrutura do JSON de permissões: { CARGO: { area: nivel } }
const permissoesSchema = z.record(
  z.enum(['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR', 'VISUALIZADOR']),
  z.record(z.string().max(100), nivelSchema)
)

// Permissões padrão do sistema
const PERMISSOES_PADRAO: Record<string, Record<string, string>> = {
  ADMIN:       { Dashboard: 'total', 'Assistente IA': 'total', Pedidos: 'total', Orçamentos: 'total', Clientes: 'total', CRM: 'total', Produção: 'total', Estoque: 'total', Relatórios: 'total', Equipe: 'total', Convites: 'total', Configurações: 'total' },
  SOCIO:       { Dashboard: 'total', 'Assistente IA': 'total', Pedidos: 'total', Orçamentos: 'total', Clientes: 'total', CRM: 'total', Produção: 'total', Estoque: 'total', Relatórios: 'total', Equipe: 'leitura', Convites: 'total', Configurações: 'leitura' },
  GERENTE:     { Dashboard: 'total', 'Assistente IA': 'total', Pedidos: 'total', Orçamentos: 'total', Clientes: 'total', CRM: 'total', Produção: 'total', Estoque: 'total', Relatórios: 'nao',   Equipe: 'leitura', Convites: 'nao',   Configurações: 'nao' },
  OPERADOR:    { Dashboard: 'leitura', 'Assistente IA': 'total', Pedidos: 'total', Orçamentos: 'total', Clientes: 'total', CRM: 'total', Produção: 'total', Estoque: 'total', Relatórios: 'nao', Equipe: 'nao', Convites: 'nao', Configurações: 'nao' },
  VISUALIZADOR:{ Dashboard: 'leitura', 'Assistente IA': 'nao', Pedidos: 'leitura', Orçamentos: 'leitura', Clientes: 'leitura', CRM: 'nao', Produção: 'nao', Estoque: 'leitura', Relatórios: 'nao', Equipe: 'nao', Convites: 'nao', Configurações: 'nao' },
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.cargo !== 'ADMIN' && session.user.cargo !== 'SOCIO') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const config = await prisma.configuracaoEmpresa.findUnique({ where: { id: 'empresa' } })
    const permissoes = config?.permissoesJson
      ? JSON.parse(config.permissoesJson)
      : PERMISSOES_PADRAO

    return NextResponse.json({ permissoes, padrao: PERMISSOES_PADRAO })
  } catch (erro) {
    console.error('Erro ao buscar permissões:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.cargo !== 'ADMIN' && session.user.cargo !== 'SOCIO') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = permissoesSchema.safeParse(body.permissoes)
    if (!validacao.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: validacao.error.flatten() }, { status: 400 })
    }

    const novasPermissoes = validacao.data

    // SOCIO não pode alterar permissões do cargo ADMIN
    if (session.user.cargo === 'SOCIO' && novasPermissoes['ADMIN']) {
      return NextResponse.json({ erro: 'SÓCIO não pode alterar permissões do ADMIN' }, { status: 403 })
    }

    // Buscar configuração atual para mesclar (SOCIO preserva coluna ADMIN)
    const configAtual = await prisma.configuracaoEmpresa.findUnique({ where: { id: 'empresa' } })
    const permissoesAtuais: Record<string, Record<string, string>> = configAtual?.permissoesJson
      ? JSON.parse(configAtual.permissoesJson)
      : PERMISSOES_PADRAO

    const permissoesMescladas: Record<string, Record<string, string>> = { ...permissoesAtuais, ...(novasPermissoes as Record<string, Record<string, string>>) }
    // Se SOCIO, restaura ADMIN original
    if (session.user.cargo === 'SOCIO') {
      permissoesMescladas['ADMIN'] = permissoesAtuais['ADMIN'] ?? PERMISSOES_PADRAO['ADMIN']
    }

    await prisma.configuracaoEmpresa.upsert({
      where: { id: 'empresa' },
      update: { permissoesJson: JSON.stringify(permissoesMescladas) },
      create: { id: 'empresa', permissoesJson: JSON.stringify(permissoesMescladas) },
    })

    return NextResponse.json({ permissoes: permissoesMescladas })
  } catch (erro) {
    console.error('Erro ao salvar permissões:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
