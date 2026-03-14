# 3D Sinc — Sistema Integrado de Gestão + IA
> Arquivo de instruções para Claude Code

---

## Contexto do Projeto

**Empresa:** 3D Sinc  
**Segmento:** Impressão 3D por encomenda  
**Equipe:** 1 a 5 pessoas  
**Objetivo:** Sistema web completo com ERP próprio, controle de filamentos e assistente IA integrado

---

## Stack Tecnológica

**Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui, TypeScript  
**Backend:** Next.js API Routes, PostgreSQL, Prisma ORM  
**IA:** Anthropic Claude API - modelo claude-sonnet-4-20250514  
**Infra:** Docker Compose (dev local), Vercel ou Railway (deploy)

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

### Fluxo de convite para novo membro

```
ADMIN gera convite → envia link por email
→ membro acessa /primeiro-acesso?token=xxx
→ define nome, senha e avatar
→ redireciona para dashboard
```

```typescript
// app/api/convite/route.ts (gerar convite — somente ADMIN)
export async function POST(req: Request) {
  const session = await getServerSession()
  if (session?.user.cargo !== 'ADMIN') return new Response('Proibido', { status: 403 })

  const { email, cargo } = await req.json()

  // SOCIO nao pode ser criado via convite — apenas pelo ADMIN diretamente
  if (cargo === 'ADMIN') return new Response('Proibido', { status: 403 })

  const convite = await prisma.convite.create({
    data: {
      email,
      cargo,
      enviadoPor: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    }
  })

  // TODO: enviar email com link /primeiro-acesso?token=${convite.token}
  return Response.json({ token: convite.token })
}
```

### Pagina de perfil — dados editaveis pelo proprio usuario

```typescript
// app/(dashboard)/perfil/page.tsx
// Campos editaveis: nome, telefone, avatarUrl, senha
// Campos somente leitura: email, cargo (so admin pode alterar cargo)
```

### O que aparece no topbar

O topbar deve exibir o avatar, nome e cargo do usuario logado, com menu dropdown contendo:
- Meu Perfil
- Alterar Senha
- Sair

---

## Protecao de Rotas — Middleware

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

## Modulo IA — Contexto Dinamico

A IA busca dados reais do banco antes de cada resposta:

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
    model: 'claude-sonnet-4-20250514',
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
2. Modelo de Usuario com cargos (ADMIN, GERENTE, OPERADOR, VISUALIZADOR)
3. Fluxo de convite — admin convida membros por email
4. Pagina de Perfil — cada membro edita seus proprios dados
5. Pagina de Equipe — admin visualiza e gerencia membros
6. CRUD de Pedidos com historico de status
7. Cadastro de Filamentos (marca, material, cor, peso)
8. Dashboard com metricas principais
9. IA Chat com contexto ERP em tempo real

### Fase 2
10. Alertas automaticos de estoque baixo e pedidos atrasados
11. Exportacao de relatorios em PDF
12. Gerador de orcamentos com calculo de filamento e tempo
13. PWA — manifest + service worker para instalacao no celular

### Fase 3
14. Portal do cliente para acompanhamento de pedidos
15. CRM leve com pipeline de vendas
16. App nativo com React Native (reutiliza toda a API)

---

## Comandos de Inicializacao

```bash
npx create-next-app@latest 3dsinc-system --typescript --tailwind --app
cd 3dsinc-system
npm install @prisma/client prisma @anthropic-ai/sdk next-auth @auth/prisma-adapter zod bcryptjs
npm install -D @types/bcryptjs
npx shadcn-ui@latest init
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

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