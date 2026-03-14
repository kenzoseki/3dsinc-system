# 3D Sinc — Sistema Integrado de Gestão + IA
> Arquivo de instruções para Claude Code

---

## Contexto do Projeto

**Empresa:** 3D Sinc  
**Segmento:** Impressão 3D por encomenda  
**Equipe:** 1 a 5 pessoas  
**Objetivo:** Sistema web completo com ERP próprio, controle de filamentos e assistente IA integrado

---

## Stack e Infraestrutura

**Frontend/Backend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui, TypeScript
**Banco:** PostgreSQL via Neon (regiao Sao Paulo — sa-east-1)
**ORM:** Prisma
**IA:** Anthropic Claude API - modelo claude-sonnet-4-20250514
**NF-e:** nfewizard-io (biblioteca Node.js nativa para SEFAZ)

### Hospedagem — trajetoria recomendada

```
Vercel Free  →  Railway Starter  →  VPS proprio
(dev / MVP)     (producao leve)     (quando volume justificar)
               ~R$25-60/mes
```

O Neon tem plano gratuito com regiao em Sao Paulo. Banco e app na mesma regiao = baixa latencia sem custo adicional.

### Atencao: NF-e nao pode rodar na Vercel

A biblioteca nfewizard-io requer acesso ao sistema de arquivos (certificado .pfx) e conexao persistente com os webservices da SEFAZ — incompativel com o modelo serverless da Vercel. Para emissao de NF-e, usar **Railway** desde o inicio ou manter um microservico separado em VPS.

---

## Modulo NF-e — Emissor Proprio

### Requisitos obrigatorios (legais)

| Requisito | Detalhe |
|-----------|---------|
| CNPJ ativo | Empresa credenciada na SEFAZ do estado |
| Certificado digital A1 | Padrao ICP-Brasil, contendo o CNPJ da empresa. Validade 1 ano. Arquivo .pfx armazenado no servidor |
| Credenciamento SEFAZ | A maioria dos estados credencia automaticamente pelo CNAE. MEI precisa credenciar manualmente |
| Ambiente de homologacao | Obrigatorio testar antes de emitir em producao |

### Fluxo tecnico de emissao

```
Sistema gera XML da NF-e
    → XML assinado digitalmente com certificado A1
    → Transmitido via webservice SEFAZ
    → SEFAZ valida e retorna protocolo de autorizacao
    → DANFE gerado em PDF para impressao/envio
```

### Biblioteca recomendada — nfewizard-io

```bash
npm install nfewizard-io
```

```typescript
// lib/nfe.ts
import NFeWizard from 'nfewizard-io'

const nfewizard = new NFeWizard()

await nfewizard.NFE_LoadEnvironment({
  config: {
    dfe: {
      pathCertificado: process.env.NFE_CERT_PATH,   // caminho do .pfx no servidor
      senhaCertificado: process.env.NFE_CERT_SENHA,
      UF: 'SP',
      CPFCNPJ: process.env.NFE_CNPJ,
      armazenarXMLAutorizacao: true,
      pathXMLAutorizacao: 'storage/nfe/autorizadas',
    },
    nfe: {
      ambiente: process.env.NODE_ENV === 'production' ? 1 : 2, // 1=producao 2=homologacao
      versaoDF: '4.00',
    }
  }
})

export { nfewizard }
```

### Variaveis de ambiente adicionais

```
NFE_CERT_PATH="./storage/certificado.pfx"
NFE_CERT_SENHA="senha-do-certificado"
NFE_CNPJ="00000000000000"
```

### O que o modulo NF-e deve cobrir no sistema

- Geracao automatica do XML a partir dos dados do pedido
- Assinatura e transmissao para SEFAZ
- Armazenamento do XML autorizado e protocolo
- Geracao do DANFE em PDF
- Cancelamento de NF-e (dentro do prazo legal)
- Contingencia offline (emissao em modo DPEC quando SEFAZ fora do ar)

### Posicionamento no roadmap

Este modulo entra na **Fase 2**, apos o MVP estar estavel. Requer:
- Certificado A1 adquirido junto a AC credenciada ICP-Brasil (~R$150-300/ano)
- Testes no ambiente de homologacao da SEFAZ antes de producao
- Consulta ao contador da empresa para configurar CFOP, CST e aliquotas corretas

---

## Estrutura de Pastas

```
3dsinc-system/
├── app/
│   ├── (auth)/
│   │   ├── login/              # Pagina de login
│   │   └── primeiro-acesso/    # Cadastro via convite
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Topbar com avatar
│   │   ├── page.tsx            # Dashboard principal
│   │   ├── pedidos/            # ERP - Pedidos
│   │   ├── producao/           # ERP - Producao
│   │   ├── estoque/            # Modulo Filamentos
│   │   ├── assistente/         # IA Chat
│   │   ├── perfil/             # Perfil do usuario logado
│   │   └── equipe/             # Gerenciamento de equipe (admin)
│   └── api/
│       ├── pedidos/
│       ├── filamentos/
│       ├── producao/
│       ├── perfil/             # Atualizar dados do proprio perfil
│       ├── equipe/             # CRUD membros (admin only)
│       ├── convite/            # Gerar e validar convites
│       └── ia/chat/            # Endpoint Claude API
├── components/
│   ├── ui/                     # shadcn/ui
│   ├── dashboard/
│   ├── pedidos/
│   ├── estoque/
│   ├── chat/
│   ├── equipe/                 # Tabela de membros, modal de convite
│   └── perfil/                 # Avatar, card de perfil, form de edicao
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── claude.ts               # Anthropic client
│   ├── erp-context.ts          # Contexto dinamico para IA
│   ├── auth.ts                 # Config NextAuth + permissoes
│   └── permissoes.ts           # Helper de verificacao de cargo
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                 # Cria o primeiro usuario ADMIN
└── public/
    └── reference/dashboard.html
```

---

## Schema do Banco (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Usuario {
  id            String        @id @default(cuid())
  nome          String
  email         String        @unique
  senha         String
  cargo         Cargo         @default(OPERADOR)
  avatarUrl     String?
  telefone      String?
  ativo         Boolean       @default(true)
  primeiroAcesso Boolean      @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  historicos    HistoricoPedido[]
  convitesEnviados Convite[]  @relation("ConviteEnviador")
}

enum Cargo {
  ADMIN        // acesso total, gerencia equipe e configuracoes do sistema
  SOCIO        // acesso total a dados e relatorios, sem gerenciar equipe ou sistema
  GERENTE      // acesso operacional completo, sem relatorios financeiros
  OPERADOR     // acesso operacional (pedidos, estoque)
  VISUALIZADOR // somente leitura
}

model Convite {
  id          String   @id @default(cuid())
  email       String
  cargo       Cargo    @default(OPERADOR)
  token       String   @unique @default(cuid())
  usado       Boolean  @default(false)
  expiresAt   DateTime
  enviadoPor  String
  enviador    Usuario  @relation("ConviteEnviador", fields: [enviadoPor], references: [id])
  createdAt   DateTime @default(now())
}

model Cliente {
  id        String   @id @default(cuid())
  nome      String
  email     String?
  telefone  String?
  empresa   String?
  cpfCnpj   String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  pedidos   Pedido[]
}

model Pedido {
  id           String          @id @default(cuid())
  numero       Int             @unique @default(autoincrement())
  clienteId    String
  cliente      Cliente         @relation(fields: [clienteId], references: [id])
  tipo         TipoPedido      @default(B2C)
  categoria    String?
  descricao    String
  arquivo3d    String?
  status       StatusPedido    @default(ORCAMENTO)
  prioridade   Prioridade      @default(NORMAL)
  valorTotal   Decimal?        @db.Decimal(10, 2)
  prazoEntrega DateTime?
  observacoes  String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  itens        ItemPedido[]
  historico    HistoricoPedido[]
}

enum TipoPedido {
  B2C  // venda direta para pessoa fisica
  B2B  // venda para empresa
}

enum StatusPedido {
  ORCAMENTO
  APROVADO
  EM_PRODUCAO
  PAUSADO
  CONCLUIDO
  ENTREGUE
  CANCELADO
}

enum Prioridade {
  BAIXA
  NORMAL
  ALTA
  URGENTE
}

model ItemPedido {
  id            String     @id @default(cuid())
  pedidoId      String
  pedido        Pedido     @relation(fields: [pedidoId], references: [id])
  filamentoId   String?
  filamento     Filamento? @relation(fields: [filamentoId], references: [id])
  descricao     String
  quantidade    Int        @default(1)
  pesoGramas    Decimal?   @db.Decimal(8, 2)
  tempoHoras    Decimal?   @db.Decimal(6, 2)
  valorUnitario Decimal?   @db.Decimal(10, 2)
}

model HistoricoPedido {
  id          String       @id @default(cuid())
  pedidoId    String
  pedido      Pedido       @relation(fields: [pedidoId], references: [id])
  usuarioId   String?
  usuario     Usuario?     @relation(fields: [usuarioId], references: [id])
  status      StatusPedido
  nota        String?
  createdAt   DateTime     @default(now())
}

model Filamento {
  id          String         @id @default(cuid())
  marca       String
  material    MaterialType
  cor         String
  corHex      String?
  diametro    Decimal        @db.Decimal(4, 2)
  pesoTotal   Decimal        @db.Decimal(8, 2)
  pesoAtual   Decimal        @db.Decimal(8, 2)
  temperatura Int?
  velocidade  Int?
  localizacao String?
  ativo       Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  itensPedido ItemPedido[]
  alertas     AlertaEstoque[]
}

enum MaterialType {
  PLA
  PETG
  ABS
  TPU
  ASA
  PLA_PLUS
  RESIN_STANDARD
  RESIN_ABS_LIKE
  NYLON
  OUTRO
}

model AlertaEstoque {
  id          String    @id @default(cuid())
  filamentoId String
  filamento   Filamento @relation(fields: [filamentoId], references: [id])
  tipoAlerta  String
  lido        Boolean   @default(false)
  createdAt   DateTime  @default(now())
}
```

### Seed — primeiro usuario ADMIN

Sem seed, ninguem consegue logar pela primeira vez. Criar obrigatoriamente:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const senha = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where: { email: 'admin@3dsinc.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@3dsinc.com.br',
      senha,
      cargo: 'ADMIN',
      primeiroAcesso: false,
    }
  })
  console.log('Seed concluido: admin@3dsinc.com.br / admin123')
}

main().finally(() => prisma.$disconnect())
```

Adicionar ao `package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

Executar com: `npx prisma db seed`

### Extensao de tipos do NextAuth

O NextAuth nao conhece os campos `cargo` e `id` do Usuario por padrao. Criar obrigatoriamente:

```typescript
// types/next-auth.d.ts
import { Cargo } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      nome: string
      email: string
      cargo: Cargo
      avatarUrl?: string | null
    }
  }
}
```

### Config do NextAuth

```typescript
// lib/auth.ts
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) return null
        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        })
        if (!usuario || !usuario.ativo) return null
        const senhaValida = await bcrypt.compare(credentials.senha, usuario.senha)
        if (!senhaValida) return null
        return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo, avatarUrl: usuario.avatarUrl }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) { token.id = user.id; token.cargo = user.cargo; token.nome = user.nome; token.avatarUrl = user.avatarUrl }
      return token
    },
    async session({ session, token }: any) {
      session.user.id = token.id
      session.user.cargo = token.cargo
      session.user.nome = token.nome
      session.user.avatarUrl = token.avatarUrl
      return session
    }
  },
  pages: { signIn: '/login' }
}
```

---

## Modulo de Perfis e Equipe

### Cargos e Permissoes

| Cargo | Dashboard | Pedidos | Estoque | IA | Relatorios | Equipe | Sistema |
|-------|-----------|---------|---------|-----|------------|--------|---------|
| ADMIN | leitura/escrita | leitura/escrita | leitura/escrita | sim | sim | gerenciar | sim |
| SOCIO | leitura/escrita | leitura/escrita | leitura/escrita | sim | sim | somente leitura | nao |
| GERENTE | leitura/escrita | leitura/escrita | leitura/escrita | sim | nao | somente leitura | nao |
| OPERADOR | leitura | leitura/escrita | leitura/escrita | sim | nao | sem acesso | nao |
| VISUALIZADOR | leitura | somente leitura | somente leitura | nao | nao | sem acesso | nao |

### Helper de permissoes

```typescript
// lib/permissoes.ts
import { Cargo } from '@prisma/client'

export const Permissoes = {
  podeGerenciarEquipe:   (cargo: Cargo) => cargo === 'ADMIN',
  podeAcessarSistema:    (cargo: Cargo) => cargo === 'ADMIN',
  podeVerRelatorios:     (cargo: Cargo) => ['ADMIN', 'SOCIO'].includes(cargo),
  podeEscreverPedidos:   (cargo: Cargo) => ['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'].includes(cargo),
  podeEscreverEstoque:   (cargo: Cargo) => ['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'].includes(cargo),
  podeUsarIA:            (cargo: Cargo) => ['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'].includes(cargo),
  podeVerEquipe:         (cargo: Cargo) => ['ADMIN', 'SOCIO', 'GERENTE'].includes(cargo),
}
```

### Pagina /perfil — editavel pelo proprio usuario

Campos EDITAVEIS pelo usuario logado:
- nome
- telefone
- avatarUrl (upload de foto)
- senha (formulario separado com confirmacao)

Campos SOMENTE LEITURA na pagina de perfil:
- email (nao pode ser alterado pelo usuario)
- cargo (somente ADMIN pode alterar cargo de outro usuario)

### Pagina /equipe — gerenciavel pelo ADMIN

A pagina deve exibir uma tabela com todos os membros cadastrados contendo: nome, email, cargo, status (ativo/inativo) e data de entrada. Acoes disponiveis por linha: editar cargo, ativar/desativar membro. Botao de novo convite visivel no topo da pagina.

ADMIN pode:
- Ver todos os membros
- Alterar cargo de qualquer membro (exceto promover para ADMIN)
- Ativar e desativar membros
- Gerar e reenviar convites

SOCIO e GERENTE podem:
- Ver a lista de membros (somente leitura)

### Fluxo de convite — implementar completamente

```
1. ADMIN acessa /equipe e clica em "Convidar membro"
2. Preenche email e escolhe cargo (exceto ADMIN e SOCIO)
3. Sistema gera token e salva no banco (model Convite)
4. Link gerado: /primeiro-acesso?token=TOKEN
5. ADMIN copia o link e envia manualmente (email, WhatsApp, etc.)
   (envio automatico de email pode ser adicionado depois via Resend)
6. Membro acessa o link, confere email pre-preenchido
7. Define nome, senha e faz upload de avatar (opcional)
8. Conta criada, token marcado como usado, redireciona para /dashboard
```

```typescript
// app/api/convite/route.ts (gerar convite — somente ADMIN)
export async function POST(req: Request) {
  const session = await getServerSession()
  if (session?.user.cargo !== 'ADMIN') return new Response('Proibido', { status: 403 })

  const { email, cargo } = await req.json()

  // ADMIN e SOCIO nao podem ser criados via convite
  if (['ADMIN', 'SOCIO'].includes(cargo)) return new Response('Proibido', { status: 403 })

  const convite = await prisma.convite.create({
    data: {
      email,
      cargo,
      enviadoPor: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    }
  })

  const link = `${process.env.NEXTAUTH_URL}/primeiro-acesso?token=${convite.token}`
  return Response.json({ token: convite.token, link })
}

// app/api/convite/validar/route.ts (validar token ao acessar /primeiro-acesso)
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  const convite = await prisma.convite.findUnique({ where: { token } })
  if (!convite || convite.usado || convite.expiresAt < new Date()) {
    return new Response('Convite invalido ou expirado', { status: 410 })
  }
  return Response.json({ email: convite.email, cargo: convite.cargo })
}
```

### O que aparece no topbar

O topbar deve exibir o avatar, nome e cargo do usuario logado, com menu dropdown contendo:
- Meu Perfil → /perfil
- Alterar Senha → modal ou /perfil#senha
- Sair → signOut()

---

## Modulo de Filamentos — Cadastro e Edicao

O cadastro de filamentos deve suportar criacao e edicao completa. Cada filamento cadastrado precisa de um botao "Editar" que abre o mesmo formulario pre-preenchido com os dados atuais.

Campos do formulario (criacao e edicao):
- marca (texto livre)
- material (select: PLA, PETG, ABS, TPU, ASA, PLA_PLUS, RESIN_STANDARD, RESIN_ABS_LIKE, NYLON, OUTRO)
- cor (texto livre, ex: "Vermelho Vivo")
- corHex (color picker para exibir na UI)
- diametro (select: 1.75mm ou 2.85mm)
- pesoTotal (gramas — peso do rolo novo)
- pesoAtual (gramas — peso restante, editavel para atualizar consumo)
- temperatura (opcional, em graus Celsius)
- velocidade (opcional, em mm/s)
- localizacao (opcional, texto livre: ex "Prateleira A2")
- ativo (toggle — inativar sem excluir)

A listagem deve exibir uma barra de progresso visual por filamento mostrando o percentual restante (pesoAtual / pesoTotal). Filamentos com menos de 20% devem acionar alerta visual automaticamente.

---

## Modulo de Pedidos — CRUD completo

Campos obrigatorios no formulario de criacao e edicao de pedidos:
- tipo: B2C (Pessoa Fisica) ou B2B (Empresa) — selector destacado no topo do formulario
- cliente (busca ou cadastro rapido inline)
- descricao do pedido
- status (select com todos os StatusPedido)
- prioridade (select: BAIXA, NORMAL, ALTA, URGENTE)
- prazo de entrega (date picker)
- itens do pedido (lista dinamica com filamento, quantidade, peso estimado, tempo estimado, valor unitario)
- observacoes (textarea)
- arquivo 3D (upload opcional)

Diferencas visuais B2C vs B2B:
- Badge de tipo visivel na listagem e no detalhe do pedido
- B2B: campo adicional para razao social / CNPJ do cliente

---

## Dashboard — Metricas, Graficos e Filtros

### Filtros globais do dashboard

Seletor de periodo visivel no topo da pagina, aplicado a todos os graficos e cards simultaneamente:

| Opcao | Intervalo |
|-------|-----------|
| Hoje | dia atual |
| Esta semana | seg-dom da semana atual |
| Este mes | mes atual |
| Ultimos 3 meses | rolling 90 dias |
| Este ano | 1 jan ate hoje |
| Periodo personalizado | date picker com inicio e fim |

### Cards de metricas (linha superior)

- Total de pedidos no periodo
- Pedidos em producao (contagem atual, independe do filtro)
- Receita no periodo
- Ticket medio no periodo
- Filamentos com estoque critico (abaixo de 20%, sempre atual)

### Graficos

**1. Pedidos por status ao longo do tempo** (grafico de barras empilhadas por semana/mes)
- Eixo X: semanas ou meses do periodo selecionado
- Eixo Y: quantidade de pedidos
- Cores por status (usar paleta de badges ja definida)

**2. Estoque de filamentos** (grafico de barras horizontais)
- Um item por filamento ativo
- Barra mostra percentual restante (pesoAtual / pesoTotal)
- Vermelho abaixo de 20%, ambar entre 20-50%, verde acima de 50%
- Sem filtro de data (sempre mostra estado atual)

**3. Prospeccao de clientes — B2C vs B2B** (grafico de rosca/donut)
- Distribuicao percentual de pedidos por tipo no periodo
- Numero absoluto de clientes unicos por tipo

**4. Receita por periodo** (grafico de linha)
- Eixo X: dias, semanas ou meses (adaptado ao periodo selecionado)
- Eixo Y: valor em R$

### Biblioteca de graficos recomendada

Usar **Recharts** (ja compativel com Next.js e React, sem dependencias extras):
```bash
npm install recharts
```

Criar obrigatoriamente para bloquear acesso sem login:

```typescript
// middleware.ts (raiz do projeto)
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' }
})

export const config = {
  matcher: ['/(dashboard)/:path*', '/api/pedidos/:path*', '/api/filamentos/:path*', '/api/ia/:path*']
}
```

---

## Modulo IA — Provedor e Contexto Dinamico

### Comparativo de provedores de IA para o sistema 3D Sinc

| Provedor | Modelo recomendado | Entrada (por 1M tokens) | Saida (por 1M tokens) | Melhor para |
|----------|-------------------|------------------------|----------------------|-------------|
| **Anthropic Claude** | claude-haiku-4-5 | ~$0,80 | ~$4,00 | Custo-beneficio equilibrado, contexto longo confiavel |
| **Anthropic Claude** | claude-sonnet-4-6 | ~$3,00 | ~$15,00 | Qualidade maxima, tarefas complexas |
| **OpenAI** | gpt-4o-mini | ~$0,15 | ~$0,60 | Mais barato do mercado tier-mid |
| **OpenAI** | gpt-4o | ~$2,50 | ~$10,00 | Multimodal, bom para imagens |
| **Google** | gemini-2.0-flash | ~$0,10 | ~$0,40 | Mais barato para volume alto |
| **Google** | gemini-2.5-pro | ~$1,25 | ~$10,00 | Contexto muito longo (1M tokens) |
| **DeepSeek** | deepseek-v3 | ~$0,03 | ~$0,09 | Ultra barato, servidores na China |

### Recomendacao para comecar — Claude Haiku

Para o sistema interno da 3D Sinc com equipe de 1-5 pessoas, o volume de tokens por mes sera baixo. Estimativa realista: 500 a 2.000 queries/mes = custo de R$2 a R$15/mes com Haiku.

Usar **claude-haiku-4-5** na Fase 1 por ser o ponto otimo de custo-beneficio da Anthropic: rapido, barato e com contexto de 200k tokens — suficiente para carregar todo o ERP no prompt sem truncar. Migrar para Sonnet se a equipe sentir necessidade de respostas mais elaboradas.

Trocar o modelo e so alterar uma linha no codigo:
```typescript
model: 'claude-haiku-4-5-20251001'  // barato — comecar aqui
// model: 'claude-sonnet-4-6'       // mais capaz — migrar se necessario
```

### Contexto dinamico — busca dados antes de cada resposta

```typescript
// lib/erp-context.ts
export async function getERPContext(): Promise<string> {
  const [pedidos, filamentos, alertas] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: { in: ['APROVADO', 'EM_PRODUCAO', 'PAUSADO'] } },
      include: { cliente: true, itens: true },
      orderBy: { prazoEntrega: 'asc' },
      take: 50
    }),
    prisma.filamento.findMany({
      where: { ativo: true },
      orderBy: { pesoAtual: 'asc' }
    }),
    prisma.alertaEstoque.findMany({
      where: { lido: false },
      include: { filamento: true }
    })
  ])

  return `
=== DADOS ERP 3D SINC (tempo real) ===
PEDIDOS ATIVOS: ${pedidos.length}
${pedidos.map(p =>
  `- #${p.numero} | ${p.cliente.nome} | ${p.status} | Prazo: ${p.prazoEntrega?.toLocaleDateString('pt-BR') ?? 'Sem prazo'}`
).join('\n')}

ESTOQUE FILAMENTOS:
${filamentos.map(f =>
  `- ${f.marca} ${f.material} ${f.cor} | ${f.pesoAtual}g de ${f.pesoTotal}g`
).join('\n')}

ALERTAS NAO LIDOS: ${alertas.length}
${alertas.map(a => `- ${a.tipoAlerta}: ${a.filamento.marca} ${a.filamento.cor}`).join('\n')}
  `
}
```

```typescript
// app/api/ia/chat/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { getERPContext } from '@/lib/erp-context'

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const { messages } = await req.json()
  const erpContext = await getERPContext()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', // trocar para claude-sonnet-4-6 se necessario
    max_tokens: 1024,
    system: `Voce e o assistente IA da 3D Sinc, empresa de impressao 3D por encomenda.
Voce tem acesso em tempo real ao ERP. Use os dados abaixo para responder com precisao.
Seja objetivo e profissional. Sempre em portugues brasileiro.
Quando identificar problemas (atrasos, estoque critico), proponha acoes concretas.

${erpContext}`,
    messages
  })

  return Response.json(response)
}
```

---

## Identidade Visual — Creme Natural

### Cores

| Token | Valor | Uso |
|-------|-------|-----|
| --bg-page | #F5F3EE | Fundo geral da pagina |
| --bg-surface | #FAF9F6 | Cards, sidebar, topbar |
| --bg-hover | #F0EDE6 | Hover em itens de menu |
| --border | #E8E6E0 | Bordas gerais |
| --border-strong | #D4D1C8 | Bordas com mais enfase |
| --text-primary | #2C2A26 | Titulos e texto principal |
| --text-secondary | #6B6860 | Labels, subtitulos, placeholders |
| --purple | #5B47C8 | Primaria — botoes, links, ativo |
| --purple-light | #EDE9FC | Fundo de badges roxas |
| --purple-dark | #4C3DB5 | Hover em botoes roxos |
| --purple-text | #4C3DB5 | Texto sobre fundo roxo claro |
| --red | #B83232 | Alertas, erros, status atrasado |
| --red-light | #FCE9E9 | Fundo de badges vermelhas |
| --green | #1A6B42 | Status entregue, sucesso |
| --green-light | #E8F5EE | Fundo de badges verdes |
| --amber | #8A5A0A | Status aguardando, atencao |
| --amber-light | #FEF3E2 | Fundo de badges ambar |

### Tipografia

| Uso | Fonte | Peso | Tamanho |
|-----|-------|------|---------|
| Titulos e headings | Nunito | 700 | 18-24px |
| Corpo e labels | Inter | 400 / 500 | 13-15px |
| Numeros, IDs, timestamps | JetBrains Mono | 400 | 12-13px |

Google Fonts import:
```css
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap');
```

### Variaveis CSS globais

Declarar em `app/globals.css`:

```css
:root {
  --bg-page:        #F5F3EE;
  --bg-surface:     #FAF9F6;
  --bg-hover:       #F0EDE6;
  --border:         #E8E6E0;
  --border-strong:  #D4D1C8;
  --text-primary:   #2C2A26;
  --text-secondary: #6B6860;
  --purple:         #5B47C8;
  --purple-light:   #EDE9FC;
  --purple-dark:    #4C3DB5;
  --purple-text:    #4C3DB5;
  --red:            #B83232;
  --red-light:      #FCE9E9;
  --green:          #1A6B42;
  --green-light:    #E8F5EE;
  --amber:          #8A5A0A;
  --amber-light:    #FEF3E2;
}
```

### Badges de status de pedido

| Status | Background | Texto |
|--------|-----------|-------|
| Em producao | #EDE9FC | #4C3DB5 |
| Atrasado | #FCE9E9 | #B83232 |
| Entregue | #E8F5EE | #1A6B42 |
| Aguardando | #FEF3E2 | #8A5A0A |
| Cancelado | #F3F2EF | #6B6860 |

Referencia visual: `public/reference/dashboard.html`

---

## Roadmap de Desenvolvimento

### Fase 1 — MVP (comecar aqui)
1. Autenticacao com NextAuth (login por email + senha)
2. Modelos de Usuario e Convite com cargos (ADMIN, SOCIO, GERENTE, OPERADOR, VISUALIZADOR)
3. Fluxo de convite completo — ADMIN gera link, membro define senha e avatar em /primeiro-acesso
4. Pagina /perfil — editavel pelo proprio usuario (nome, telefone, avatar, senha)
5. Pagina /equipe — ADMIN gerencia membros, altera cargos, ativa/desativa
6. CRUD de Pedidos com tipo B2C/B2B, categoria, historico de status e itens
7. Cadastro e edicao de Filamentos com barra de progresso e alerta de estoque critico
8. Dashboard com cards de metricas, 4 graficos (Recharts) e filtros de periodo
9. IA Chat com Claude Haiku, contexto ERP dinamico em tempo real

### Fase 2
10. Alertas automaticos de estoque baixo e pedidos atrasados (email via Resend)
11. Exportacao de relatorios em PDF
12. Gerador de orcamentos com calculo de filamento e tempo
13. Modulo NF-e — emissor proprio com nfewizard-io (requer Railway)
14. PWA — manifest + service worker para instalacao no celular

### Fase 3
15. Portal do cliente para acompanhamento de pedidos
16. CRM leve com pipeline de vendas
17. App nativo com React Native (reutiliza toda a API)

---

## Comandos de Inicializacao

```bash
npx create-next-app@latest 3dsinc-system --typescript --tailwind --app
cd 3dsinc-system
npm install @prisma/client prisma @anthropic-ai/sdk next-auth @auth/prisma-adapter zod bcryptjs recharts
npm install -D @types/bcryptjs
npx shadcn-ui@latest init
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

Observacoes especificas da 3D Sinc:
- MEI ativo desde 2024 — certificado digital A1 ja adquirido, usar para NF-e na Fase 2
- Credenciamento SEFAZ para MEI deve ser feito manualmente (nao e automatico)
- Iniciar hospedagem no Railway desde o inicio (necessario para NF-e futuramente)

Variaveis de ambiente necessarias no `.env`:

```
DATABASE_URL="postgresql://user:pass@localhost:5432/3dsinc"
ANTHROPIC_API_KEY="sk-ant-..."
NEXTAUTH_SECRET="seu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Convencoes de Codigo

- TypeScript strict em todos os arquivos
- Nomes de variaveis e comentarios em portugues
- Validacao com Zod em todos os formularios e API routes
- Tratamento de erro padronizado nas API routes
- Prisma com transactions para operacoes criticas
- A IA deve sempre buscar contexto fresco do banco antes de responder