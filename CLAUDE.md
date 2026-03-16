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

**Frontend/Backend:** Next.js 16.1.6 (App Router, Turbopack), TypeScript
**Banco:** PostgreSQL via Neon (regiao Sao Paulo — sa-east-1)
**ORM:** Prisma v6
**IA:** Anthropic Claude API — modelo `claude-haiku-4-5-20251001` (padrão), `claude-sonnet-4-6` (premium)
**NF-e:** nfewizard-io (pendente de implementacao — Fase 2)

> **Atencao com params no App Router:** No Next.js 16+, `params` e uma `Promise`. Sempre usar
> `{ params }: { params: Promise<{ id: string }> }` e `const { id } = await params` nos route handlers e pages.

> **Atencao com Prisma generate:** Nunca usar `--no-engine`. Sempre `npx prisma generate` simples.
> O flag `--no-engine` gera cliente para Prisma Accelerate (exige URL `prisma://`) — incompativel com Neon direto.

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

## Modulo NF-e — Emissor Proprio (Fase 2 — PENDENTE)

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

### Variaveis de ambiente adicionais (quando implementar)

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

### Observacoes especificas da 3D Sinc

- MEI ativo desde 2024 — certificado digital A1 ja adquirido
- Credenciamento SEFAZ para MEI deve ser feito manualmente (nao e automatico)
- Requer migrar para Railway antes de implementar (incompativel com Vercel)
- Consultar contador para configurar CFOP, CST e aliquotas corretas

---

## Estrutura de Pastas (estado atual)

```
3dsinc-system/
├── app/
│   ├── (auth)/
│   │   ├── login/              # Pagina de login
│   │   └── primeiro-acesso/    # Cadastro via convite
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Topbar com avatar
│   │   ├── page.tsx            # Dashboard principal
│   │   ├── dashboard/
│   │   │   ├── pedidos/        # ERP - Pedidos (listagem, novo, [id])
│   │   │   ├── orcamentos/     # Orcamentos (listagem, novo, [id])
│   │   │   ├── estoque/        # Modulo Filamentos
│   │   │   ├── assistente/     # IA Chat
│   │   │   ├── perfil/         # Perfil do usuario logado
│   │   │   ├── equipe/         # Gerenciamento de equipe (admin)
│   │   │   └── configuracoes/  # Configuracoes da empresa
│   └── api/
│       ├── pedidos/            # CRUD + [id]/arquivos/[arquivoId]
│       ├── orcamentos/         # CRUD
│       ├── filamentos/
│       ├── clientes/
│       ├── configuracoes/
│       ├── perfil/
│       ├── equipe/
│       ├── convite/
│       └── ia/chat/
├── middleware.ts               # Protecao centralizada de /api/* e /dashboard/*
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── claude.ts               # Anthropic client
│   ├── erp-context.ts          # Contexto dinamico para IA
│   ├── auth.ts                 # Config NextAuth + permissoes
│   └── permissoes.ts           # Helper de verificacao de cargo
├── prisma/
│   ├── schema.prisma           # Schema completo (ver secao abaixo)
│   └── seed.ts                 # Cria o primeiro usuario ADMIN
└── public/
    └── reference/dashboard.html
```

---

## Schema do Banco (Prisma — estado atual)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Usuario {
  id             String            @id @default(cuid())
  nome           String
  email          String            @unique
  senha          String
  cargo          Cargo             @default(OPERADOR)
  avatarUrl      String?
  telefone       String?
  ativo          Boolean           @default(true)
  primeiroAcesso Boolean           @default(true)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  historicos     HistoricoPedido[]
  convitesEnviados Convite[]       @relation("ConviteEnviador")
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
  orcamentoId  String?
  orcamento    Orcamento?      @relation(fields: [orcamentoId], references: [id])
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
  arquivos     ArquivoPedido[]
}

enum TipoPedido {
  B2C  // venda direta para pessoa fisica
  B2B  // venda para empresa
}

enum StatusPedido {
  ORCAMENTO
  APROVADO
  AGUARDANDO   // adicionado: aguardando inicio da producao
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

model ArquivoPedido {
  id             String   @id @default(cuid())
  pedidoId       String
  pedido         Pedido   @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  nome           String
  tipo           String
  tamanhoBytes   Int
  conteudoBase64 String   @db.Text
  createdAt      DateTime @default(now())
}

model Filamento {
  id          String          @id @default(cuid())
  marca       String
  material    MaterialType
  cor         String
  corHex      String?
  diametro    Decimal         @db.Decimal(4, 2)
  pesoTotal   Decimal         @db.Decimal(8, 2)
  pesoAtual   Decimal         @db.Decimal(8, 2)
  temperatura Int?
  velocidade  Int?
  localizacao String?
  ativo       Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
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

model ConfiguracaoEmpresa {
  id                    String   @id @default("empresa")
  nomeEmpresa           String   @default("3D Sinc")
  cnpj                  String?
  email                 String?
  telefone              String?
  endereco              String?
  cidade                String?
  estado                String?
  logoBase64            String?  @db.Text
  alertaEstoqueBaixo    Boolean  @default(true)
  alertaPedidoAtrasado  Boolean  @default(true)
  alertaEmailHabilitado Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Orcamento {
  id                  String          @id @default(cuid())
  numero              Int             @unique @default(autoincrement())
  revisao             Int             @default(0)
  // Dados do cliente (desnormalizados para preservar historico)
  clienteNome         String
  clienteEmpresa      String?
  clienteCnpj         String?
  clienteEmail        String?
  clienteTelefone     String?
  clienteEndereco     String?
  clienteCep          String?
  clienteResponsavel  String?
  clienteCodInterno   String?
  // Metadados
  dataEmissao         DateTime        @default(now())
  validadeDias        Int             @default(5)
  orcamentista        String?
  cidade              String?
  // Condicoes e observacoes
  condicoesTecnicas   String?         @db.Text
  condicoesComerciais String?         @db.Text
  notas               String?         @db.Text
  // Financeiro
  frete               Decimal?        @db.Decimal(10, 2)
  aliquotaImposto     Decimal?        @db.Decimal(5, 2)
  bonusPercentual     Decimal?        @db.Decimal(5, 2)
  // Status
  status              StatusOrcamento @default(RASCUNHO)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  itens               ItemOrcamento[]
  pedidos             Pedido[]
}

enum StatusOrcamento {
  RASCUNHO
  ENVIADO
  APROVADO
  REPROVADO
  EXPIRADO
}

model ItemOrcamento {
  id            String                @id @default(cuid())
  orcamentoId   String
  orcamento     Orcamento             @relation(fields: [orcamentoId], references: [id], onDelete: Cascade)
  ordem         Int                   @default(0)
  descricao     String
  detalhamento  String?               @db.Text
  quantidade    Int                   @default(1)
  valorUnitario Decimal               @db.Decimal(10, 2)
  imagens       ImagemItemOrcamento[]
}

model ImagemItemOrcamento {
  id              String        @id @default(cuid())
  itemOrcamentoId String
  item            ItemOrcamento @relation(fields: [itemOrcamentoId], references: [id], onDelete: Cascade)
  imagemBase64    String        @db.Text
  nomeArquivo     String
  createdAt       DateTime      @default(now())
}
```

### Seed — primeiro usuario ADMIN

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

Executar com: `npx prisma db seed`

### Extensao de tipos do NextAuth

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

---

## Modulo de Pedidos — Regras de Negocio

### Fluxo de status

```
ORCAMENTO → APROVADO → AGUARDANDO → EM_PRODUCAO → CONCLUIDO → ENTREGUE
                ↓            ↓             ↓
           CANCELADO    CANCELADO      PAUSADO → EM_PRODUCAO
```

### Vinculacao com Orcamento

- Pedido pode ser vinculado a um `Orcamento` existente via `orcamentoId`
- Se vinculado, a transicao para `APROVADO` e bloqueada enquanto o orcamento nao estiver `APROVADO`
- Bloqueio ocorre tanto na UI (botao desabilitado) quanto na API (retorna 422)

### Upload de arquivos de referencia

- Qualquer tipo de arquivo (modelos 3D, imagens, documentos)
- Limite: 10 MB por arquivo
- Armazenados em base64 no campo `conteudoBase64` da tabela `ArquivoPedido`
- Download via `/api/pedidos/[id]/arquivos/[arquivoId]` (retorna binario com headers corretos)

---

## Modulo de Orcamentos — Regras de Negocio

### Identificacao

Formato de exibicao: `ORC-XXXX-YY` onde XXXX = numero (4 digitos) e YY = revisao (2 digitos)

### Calculo de totais

```
subtotal = soma(valorUnitario * quantidade) de todos os itens
imposto  = subtotal * (aliquotaImposto / 100)
bonus    = subtotal * (bonusPercentual / 100)   // desconto/acrescimo
total    = subtotal + frete + imposto + bonus
```

### Itens com imagens

Cada `ItemOrcamento` pode ter multiplas imagens (`ImagemItemOrcamento`), armazenadas em base64.
As imagens sao exibidas em uma secao "ANEXO DE IMAGENS" nas ultimas paginas do PDF.

### PDF via navegador

A pagina `/dashboard/orcamentos/[id]` usa `window.print()` com `@media print` para gerar PDF.
Nao ha geracao programatica de PDF — depende do navegador do usuario.

---

## Modulo de Filamentos — Regras de Negocio

- Alerta de estoque critico: quando `pesoAtual < pesoTotal * 0.20` (menos de 20%)
- Alerta criado automaticamente ao editar um filamento via `PATCH /api/filamentos/[id]`
- O alerta e registrado na tabela `AlertaEstoque` com `tipoAlerta = 'ESTOQUE_BAIXO'`
- Filamentos inativos (`ativo = false`) nao aparecem nos graficos do dashboard

---

## Modulo IA — Contexto Dinamico

A IA busca dados frescos do ERP antes de cada resposta via `lib/erp-context.ts`.
Inclui: pedidos ativos (APROVADO, AGUARDANDO, EM_PRODUCAO, PAUSADO), filamentos, alertas nao lidos.

Modelo atual: `claude-haiku-4-5-20251001`. Para migrar para Sonnet, alterar uma linha em `app/api/ia/chat/route.ts`.

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

### Badges de status de pedido

| Status | Background | Texto | Label |
|--------|-----------|-------|-------|
| ORCAMENTO | #FCE9E9 | #B83232 | Orçamento |
| APROVADO | #FEF3E2 | #8A5A0A | Aprovado |
| AGUARDANDO | #FEF3E2 | #8A5A0A | Aguardando |
| EM_PRODUCAO | #EDE9FC | #4C3DB5 | Em Produção |
| PAUSADO | #FCE9E9 | #B83232 | Pausado |
| CONCLUIDO | #E8F5EE | #1A6B42 | Concluído |
| ENTREGUE | #E8F5EE | #1A6B42 | Entregue |
| CANCELADO | #F3F2EF | #6B6860 | Cancelado |

Referencia visual: `public/reference/dashboard.html`

---

## Roadmap de Desenvolvimento

### Fase 1 — MVP ✅ CONCLUIDA

1. ✅ Autenticacao com NextAuth (login por email + senha)
2. ✅ Modelos de Usuario e Convite com cargos (ADMIN, SOCIO, GERENTE, OPERADOR, VISUALIZADOR)
3. ✅ Fluxo de convite completo — ADMIN gera link, membro define senha e avatar em /primeiro-acesso
4. ✅ Pagina /perfil — editavel pelo proprio usuario (nome, telefone, avatar, senha)
5. ✅ Pagina /equipe — ADMIN gerencia membros, altera cargos, ativa/desativa
6. ✅ CRUD de Pedidos com tipo B2C/B2B, historico de status, itens, vinculacao com orcamento e upload de arquivos
7. ✅ Cadastro e edicao de Filamentos com barra de progresso e alerta de estoque critico
8. ✅ Dashboard com cards de metricas, 4 graficos (Recharts) e filtros de periodo
9. ✅ IA Chat com Claude Haiku, contexto ERP dinamico em tempo real

---

### Fase 2 — Em andamento

#### Seguranca ✅ AUDITORIA CONCLUIDA

Pentest realizado em 16/03/2026. Vulnerabilidades corrigidas:
- `GET /api/configuracoes` agora exige autenticacao (estava exposta)
- Upload de arquivos: tamanho validado pelo base64 real, nao pelo campo do cliente
- Download de arquivos: Content-Disposition e Content-Type sanitizados
- Convite validar: mensagem de erro unificada (previne enumeracao de tokens)
- `middleware.ts` criado: protecao centralizada de `/api/*` e `/dashboard/*`
- Busca de clientes: parametro truncado a 100 chars
- Perfil: rejeita campo `acao` com valor desconhecido

---

#### Item 10 — Alertas automaticos por email (Resend) — PARCIAL (~40%)

**Implementado:**
- Modelo `AlertaEstoque` no banco
- Criacao automatica de alerta `ESTOQUE_BAIXO` ao editar filamento (pesoAtual < 20%)
- Campos de configuracao na tabela `ConfiguracaoEmpresa`: `alertaEstoqueBaixo`, `alertaPedidoAtrasado`, `alertaEmailHabilitado`
- Pagina `/dashboard/configuracoes` com toggles para ativar/desativar alertas

**Pendente:**
- Instalar biblioteca `resend`: `npm install resend`
- Adicionar `RESEND_API_KEY` ao `.env`
- Implementar funcao de envio de email em `lib/email.ts`
- Criar logica de deteccao de pedidos atrasados (`prazoEntrega < hoje AND status != ENTREGUE/CANCELADO`)
- Criar job/cron de verificacao periodica (ex: rota `/api/cron/alertas` chamada via Vercel Cron ou cron externo)
- Conectar a condicao `alertaEmailHabilitado` ao envio efetivo

---

#### Item 11 — Exportacao de relatorios em PDF — PARCIAL (~30%)

**Implementado:**
- Orcamentos tem documento formatado profissionalmente com `window.print()` via navegador
- Impressao CSS otimizada com classe `.no-print` para ocultar controles

**Pendente:**
- Relatorios gerenciais dedicados (pedidos por periodo, receita, clientes, estoque)
- Pagina `/dashboard/relatorios` com filtros e opcao de exportar
- Avaliacao de biblioteca para geracao programatica: `@react-pdf/renderer` ou `html2pdf.js`
- Export sem depender do navegador (geracao server-side)

---

#### Item 12 — Gerador de orcamentos ✅ IMPLEMENTADO (100%)

**Implementado:**
- CRUD completo: listagem, criacao (`/dashboard/orcamentos/novo`), edicao e visualizacao (`/dashboard/orcamentos/[id]`)
- Itens com quantidade, valor unitario, detalhamento e imagens (base64, max 2MB/imagem)
- Calculo automatico de subtotal, frete, imposto, bonus e total geral
- Fluxo de status: RASCUNHO → ENVIADO → APROVADO / REPROVADO / EXPIRADO
- Vinculacao bidirecional com pedidos (pedido pode referenciar um orcamento)
- Documento imprimivel em PDF via navegador com layout profissional, logo e anexos de imagens
- API completa: `GET/POST /api/orcamentos` e `GET/PATCH/DELETE /api/orcamentos/[id]`

---

#### Item 13 — Modulo NF-e (nfewizard-io) — PENDENTE (0%)

**Pendente (tudo):**
- Instalar: `npm install nfewizard-io`
- Criar `lib/nfe.ts` com configuracao do ambiente SEFAZ
- Adicionar modelo `NotaFiscal` ao schema Prisma
- Criar rotas: `POST /api/pedidos/[id]/nfe` (emitir), `DELETE /api/nfe/[id]` (cancelar)
- Pagina de emissao vinculada ao detalhe do pedido
- Armazenar XML autorizado e DANFE em PDF
- Testar em ambiente de homologacao antes de producao
- **Prerequisito: migrar hospedagem para Railway** (incompativel com Vercel)

---

#### Item 14 — PWA (manifest + service worker) — PENDENTE (0%)

**Pendente (tudo):**
- Criar `/public/manifest.json` com nome, icones, cores e orientacao
- Criar icones do app: 192x192 e 512x512 (minimo)
- Adicionar meta tags PWA no `app/layout.tsx`: `theme-color`, `apple-mobile-web-app-capable`, link para manifest
- Instalar e configurar `next-pwa` no `next.config.ts`: `npm install next-pwa`
- Definir estrategia de cache (ex: cache-first para assets estaticos, network-first para API)
- Testar instalacao no Android e iOS

---

### Fase 3 — Planejada

15. Portal do cliente para acompanhamento de pedidos
16. CRM leve com pipeline de vendas
17. App nativo com React Native (reutiliza toda a API)

---

## Variaveis de Ambiente

### Obrigatorias (ja configuradas)

```
DATABASE_URL="postgresql://..."        # Neon PostgreSQL
ANTHROPIC_API_KEY="sk-ant-..."         # Claude API
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

### A adicionar na Fase 2

```
RESEND_API_KEY="re_..."                # Item 10 — alertas por email
NFE_CERT_PATH="./storage/cert.pfx"    # Item 13 — NF-e
NFE_CERT_SENHA="..."                   # Item 13 — NF-e
NFE_CNPJ="00000000000000"             # Item 13 — NF-e
```

---

## Seguranca — Decisoes e Convencoes

### Middleware de autenticacao

`middleware.ts` na raiz protege centralmente todas as rotas `/api/*` e `/dashboard/*`.
Rotas publicas explicitamente liberadas: `/api/auth`, `/api/convite/validar`, `/api/convite/aceitar`.
Ainda assim, cada route handler chama `getServerSession` individualmente para verificar cargo/permissao.

### Validacao de uploads base64

- Limite de tamanho validado pelo tamanho real do base64 (nao pelo campo `tamanhoBytes` que vem do cliente)
- Schema Zod usa `.max(14_100_000)` no campo `conteudoBase64` (~10 MB em base64)
- Bytes reais calculados via `Math.floor((base64.length * 3) / 4)`

### Content-Disposition e Content-Type

Ao servir arquivos para download (`/api/pedidos/[id]/arquivos/[arquivoId]`):
- Nome do arquivo sanitizado: remove `"`, `\r`, `\n` para evitar header injection
- Content-Type validado com regex antes de usar; fallback para `application/octet-stream`

### Tokens de convite

Mensagem de erro unificada para token inexistente, expirado ou ja utilizado (evita enumeracao).

### Busca de texto livre

Parametros de busca (ex: `/api/clientes?busca=`) truncados a 100 chars no servidor.

---

## Convencoes de Codigo

- TypeScript strict em todos os arquivos
- Nomes de variaveis e comentarios em portugues
- Validacao com Zod em todos os formularios e API routes — incluir `.max()` em campos de texto livre
- Tratamento de erro padronizado nas API routes
- Prisma com transactions para operacoes criticas
- A IA deve sempre buscar contexto fresco do banco antes de responder
- Arquivos binarios (imagens, documentos) armazenados em base64 no banco (campo `@db.Text`)
- Nunca usar `npx prisma generate --no-engine`
- Sempre `await params` nos route handlers do App Router (Next.js 16+)
- Toda nova rota `/api/*` deve chamar `getServerSession` e verificar cargo quando necessario
