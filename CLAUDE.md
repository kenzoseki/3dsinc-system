# 3D Sinc — Sistema Integrado de Gestão + IA
> Arquivo de instruções para Claude Code

---

## Contexto do Projeto

**Empresa:** 3D Sinc — Impressão 3D por encomenda (1 a 5 pessoas)
**Objetivo:** ERP próprio com controle de pedidos, filamentos, orçamentos, clientes e assistente IA integrado

---

## Stack e Infraestrutura

| Camada | Tecnologia |
|--------|-----------|
| Frontend/Backend | Next.js 16.1.6 (App Router, Turbopack), TypeScript |
| Banco | PostgreSQL via Neon — região `sa-east-1` (São Paulo) |
| ORM | Prisma v6 |
| Auth | NextAuth.js |
| IA | Anthropic Claude API — `claude-haiku-4-5-20251001` (padrão), `claude-sonnet-4-6` (premium) |
| NF-e | nfewizard-io — pendente (Fase 2, requer Railway) |

### Atenções críticas

> **App Router — params é Promise:** Sempre usar `{ params }: { params: Promise<{ id: string }> }` e `const { id } = await params` em route handlers e pages (Next.js 16+).

> **Prisma generate:** Nunca usar `--no-engine`. Sempre `npx prisma generate` simples. O flag `--no-engine` gera cliente para Prisma Accelerate (exige URL `prisma://`) — incompatível com Neon direto.

### Hospedagem — trajetória recomendada

```
Vercel Free  →  Railway Starter  →  VPS próprio
(dev / MVP)     (~R$25-60/mês)      (quando volume justificar)
```

> **NF-e não roda na Vercel:** `nfewizard-io` requer acesso ao sistema de arquivos e conexão persistente com SEFAZ. Migrar para Railway antes de implementar.

---

## Estrutura de Pastas

```
3dsinc-system/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── primeiro-acesso/        # Cadastro via convite
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + Topbar responsivos
│   │   └── dashboard/
│   │       ├── page.tsx            # Dashboard principal (métricas + gráficos)
│   │       ├── pedidos/            # CRUD + histórico + upload de arquivos
│   │       ├── orcamentos/         # CRUD + PDF via navegador
│   │       ├── clientes/           # Listagem, detalhe, CRUD
│   │       ├── producao/           # Fila AGUARDANDO + EM_PRODUCAO
│   │       ├── estoque/            # Filamentos com alertas de estoque
│   │       ├── assistente/         # IA Chat com contexto ERP
│   │       ├── perfil/
│   │       ├── equipe/             # Gerenciamento de equipe (admin)
│   │       └── configuracoes/
│   └── api/
│       ├── pedidos/                # CRUD + [id]/arquivos/[arquivoId]
│       ├── orcamentos/             # CRUD + paginação + filtro status
│       ├── clientes/               # CRUD + [id] GET/PATCH/DELETE
│       ├── filamentos/
│       ├── configuracoes/
│       ├── perfil/
│       ├── equipe/
│       ├── convite/
│       └── ia/chat/
├── proxy.ts                        # Auth centralizada /api/* e /dashboard/* (Next.js 16)
├── lib/
│   ├── db.ts                       # Prisma client
│   ├── claude.ts                   # Anthropic client
│   ├── erp-context.ts              # Contexto dinâmico para IA
│   ├── auth.ts                     # Config NextAuth + permissões
│   └── permissoes.ts               # Helper de verificação de cargo
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # Cria o primeiro usuário ADMIN
└── public/
    └── reference/dashboard.html    # Referência visual
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
  AGUARDANDO   // aguardando inicio da producao
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
  // Dados do cliente desnormalizados (preserva histórico)
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
  // Condições e observações
  condicoesTecnicas   String?         @db.Text
  condicoesComerciais String?         @db.Text
  notas               String?         @db.Text
  // Financeiro
  frete               Decimal?        @db.Decimal(10, 2)
  aliquotaImposto     Decimal?        @db.Decimal(5, 2)
  bonusPercentual     Decimal?        @db.Decimal(5, 2)
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

### Seed — primeiro usuário ADMIN

```bash
npx prisma db seed
```

```typescript
// prisma/seed.ts — admin@3dsinc.com.br / admin123
```

### Extensão de tipos do NextAuth

```typescript
// types/next-auth.d.ts
declare module 'next-auth' {
  interface Session {
    user: { id: string; nome: string; email: string; cargo: Cargo; avatarUrl?: string | null }
  }
}
```

---

## Módulos — Regras de Negócio

### Perfis e Permissões

| Cargo | Dashboard | Pedidos | Estoque | IA | Relatórios | Equipe | Sistema |
|-------|-----------|---------|---------|-----|------------|--------|---------|
| ADMIN | R/W | R/W | R/W | sim | sim | gerenciar | sim |
| SOCIO | R/W | R/W | R/W | sim | sim | leitura | não |
| GERENTE | R/W | R/W | R/W | sim | não | leitura | não |
| OPERADOR | leitura | R/W | R/W | sim | não | — | não |
| VISUALIZADOR | leitura | leitura | leitura | não | não | — | não |

Helper em `lib/permissoes.ts` — funções: `podeGerenciarEquipe`, `podeAcessarSistema`, `podeVerRelatorios`, `podeEscreverPedidos`, `podeEscreverEstoque`, `podeUsarIA`, `podeVerEquipe`.

### Pedidos

**Fluxo de status:**
```
ORCAMENTO → APROVADO → AGUARDANDO → EM_PRODUCAO → CONCLUIDO → ENTREGUE
                ↓            ↓             ↓
           CANCELADO    CANCELADO      PAUSADO → EM_PRODUCAO
```

- Pedido vinculado a orçamento: transição para `APROVADO` bloqueada enquanto orçamento não estiver `APROVADO` (UI + API retorna 422)
- Upload de arquivos: qualquer tipo, limite 10 MB, armazenados em base64 em `ArquivoPedido`

### Orçamentos

- Formato: `ORC-XXXX-YY` (número 4 dígitos + revisão 2 dígitos)
- Cálculo: `total = subtotal + frete + (subtotal × aliquotaImposto%) + (subtotal × bonusPercentual%)`
- Itens podem ter múltiplas imagens (base64, exibidas como "ANEXO DE IMAGENS" no PDF)
- PDF gerado via `window.print()` com `@media print` — sem geração programática

### Filamentos

- Alerta crítico: `pesoAtual < pesoTotal × 0.20`
- Alerta criado automaticamente no `PATCH /api/filamentos/[id]`, gravado em `AlertaEstoque` com `tipoAlerta = 'ESTOQUE_BAIXO'`
- Filamentos com `ativo = false` não aparecem nos gráficos do dashboard

### IA — Contexto Dinâmico

- Busca dados frescos via `lib/erp-context.ts` antes de cada resposta
- Inclui: pedidos ativos (APROVADO, AGUARDANDO, EM_PRODUCAO, PAUSADO), filamentos, alertas não lidos
- Modelo: `claude-haiku-4-5-20251001` — para Sonnet, alterar uma linha em `app/api/ia/chat/route.ts`

---

## Identidade Visual — Creme Natural

### Cores CSS

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-page` | `#F5F3EE` | Fundo geral |
| `--bg-surface` | `#FAF9F6` | Cards, sidebar, topbar |
| `--bg-hover` | `#F0EDE6` | Hover em itens de menu |
| `--border` | `#E8E6E0` | Bordas gerais |
| `--text-primary` | `#2C2A26` | Títulos e texto principal |
| `--text-secondary` | `#6B6860` | Labels, subtítulos, placeholders |
| `--purple` | `#5B47C8` | Primária — botões, links, ativo |
| `--purple-light` | `#EDE9FC` | Fundo de badges roxas |
| `--purple-text` | `#4C3DB5` | Texto sobre fundo roxo claro |
| `--red` | `#B83232` | Alertas, erros |
| `--red-light` | `#FCE9E9` | Fundo de badges vermelhas |
| `--green` | `#1A6B42` | Sucesso, entregue |
| `--green-light` | `#E8F5EE` | Fundo de badges verdes |
| `--amber` | `#8A5A0A` | Atenção, aguardando |
| `--amber-light` | `#FEF3E2` | Fundo de badges âmbar |

### Tipografia

| Uso | Fonte | Peso |
|-----|-------|------|
| Títulos | Nunito | 700 |
| Corpo | Inter | 400/500 |
| Números/IDs/timestamps | JetBrains Mono | 400 |

### Badges de Status (Pedidos)

| Status | Fundo | Texto |
|--------|-------|-------|
| ORCAMENTO / PAUSADO | `#FCE9E9` | `#B83232` |
| APROVADO / AGUARDANDO | `#FEF3E2` | `#8A5A0A` |
| EM_PRODUCAO | `#EDE9FC` | `#4C3DB5` |
| CONCLUIDO / ENTREGUE | `#E8F5EE` | `#1A6B42` |
| CANCELADO | `#F3F2EF` | `#6B6860` |

Referência visual: `public/reference/dashboard.html`

---

## Convenções de Código

- TypeScript strict em todos os arquivos
- Nomes de variáveis e comentários em português
- Validação com Zod em todos os formulários e API routes — sempre `.max()` em campos de texto livre
- Tratamento de erro padronizado nas API routes
- Prisma com transactions para operações críticas
- Arquivos binários armazenados em base64 no banco (`@db.Text`)
- **Nunca** `npx prisma generate --no-engine`
- **Sempre** `await params` nos route handlers (Next.js 16+)
- Toda nova rota `/api/*` deve chamar `getServerSession` e verificar cargo quando necessário
- A IA deve sempre buscar contexto fresco do banco antes de responder

---

## Segurança — Decisões e Convenções

**Pentest realizado em 16/03/2026.** Todas as vulnerabilidades encontradas foram corrigidas.

### proxy.ts — Autenticação Centralizada

`proxy.ts` protege `/api/*` e `/dashboard/*`. No Next.js 16.1.6+, `middleware.ts` foi depreciado em favor de `proxy.ts` — a função exportada deve se chamar `proxy`.

Rotas públicas: `/api/auth`, `/api/convite/validar`, `/api/convite/aceitar`.
Cada route handler também chama `getServerSession` individualmente para verificar cargo.

### Validações de Segurança

| Ponto | Implementação |
|-------|--------------|
| Upload base64 | Tamanho real via `Math.floor((base64.length * 3) / 4)` — não confia no `tamanhoBytes` do cliente. Zod `.max(14_100_000)` |
| Download de arquivos | `Content-Disposition` e `Content-Type` sanitizados (regex + fallback `application/octet-stream`) |
| Tokens de convite | Mensagem de erro unificada (evita enumeração) |
| Busca de texto livre | Parâmetros truncados a 100 chars no servidor |
| Campo `acao` em perfil | Rejeita valores desconhecidos (retorna 400) |

---

## Variáveis de Ambiente

```bash
# Obrigatórias (já configuradas)
DATABASE_URL="postgresql://..."
ANTHROPIC_API_KEY="sk-ant-..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Fase 2 — alertas por email
RESEND_API_KEY="re_..."                # Resend — envio de email
EMAIL_FROM="alertas@3dsinc.com.br"    # Remetente (requer domínio verificado)
CRON_SECRET="..."                     # Gerado com: openssl rand -hex 32

# Stand-by — NF-e (requer Railway)
NFE_CERT_PATH="./storage/cert.pfx"
NFE_CERT_SENHA="..."
NFE_CNPJ="00000000000000"
```

---

## Roadmap de Desenvolvimento

### Fase 1 — MVP ✅ CONCLUÍDA

| # | Item |
|---|------|
| 1 | Autenticação com NextAuth (email + senha) |
| 2 | Usuários e Convites com cargos (5 níveis) |
| 3 | Fluxo de convite — ADMIN gera link, membro define senha e avatar |
| 4 | Página /perfil — editável pelo próprio usuário |
| 5 | Página /equipe — ADMIN gerencia membros, cargos, ativo/inativo |
| 6 | CRUD de Pedidos — B2C/B2B, histórico, itens, vínculo orçamento, upload arquivos |
| 7 | CRUD de Filamentos — barra de progresso, alerta estoque crítico |
| 8 | Dashboard — 6 KPIs, 4 gráficos Recharts, filtros de período |
| 9 | IA Chat — Claude Haiku, contexto ERP dinâmico |
| 10 | Gerador de Orçamentos — CRUD + PDF via navegador, filtros + paginação |
| 11 | Módulo Clientes — listagem, detalhe, CRUD completo |
| 12 | Fila de Produção — pedidos AGUARDANDO + EM_PRODUCAO com ações diretas |
| 13 | Responsividade — sidebar colapsável, hambúrguer, breakpoints 768px/1024px |
| 14 | Segurança — auditoria e correção de vulnerabilidades (16/03/2026) |

---

### Fase 2 — ✅ CONCLUÍDA

#### Próximos passos — ordem sugerida

| Prioridade | Item | Status | Próxima ação |
|------------|------|--------|-------------|
| 1 | Alertas por email (Resend) | ✅ 100% | `lib/email.ts`, `/api/cron/alertas`, `vercel.json` (cron 08h BRT) |
| 2 | PWA (manifest + service worker) | ✅ 100% | `app/manifest.ts`, `public/sw.js`, `PwaRegistrar`, ícones SVG |
| 3 | Relatórios PDF gerenciais | ✅ 100% | `/dashboard/relatorios`, `/api/relatorios`, PDF via `window.print()` |

#### Item: Alertas por email — ✅ Concluído

- `lib/email.ts` — `enviarAlertaEstoqueBaixo` e `enviarAlertaPedidoAtrasado` (templates HTML)
- `/api/cron/alertas` — GET protegido por `Authorization: Bearer CRON_SECRET`; verifica `alertaEmailHabilitado`, envia alertas e marca `AlertaEstoque` como lidos
- `vercel.json` — cron `0 11 * * *` (08h BRT, diário)
- Variáveis necessárias: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` (ver `.env.example`)

#### Item: PWA — ✅ Concluído

- `app/manifest.ts` — manifest nativo Next.js App Router
- `public/sw.js` — service worker: cache-first para assets, network-first para API, fallback offline
- `components/providers/PwaRegistrar.tsx` — registra o SW no cliente
- `app/offline/page.tsx` — página de fallback offline
- `public/icons/icon-192.svg` e `icon-512.svg` — ícones do app
- Sem dependência externa (`next-pwa` não utilizado — usa suporte nativo do Next.js)

#### Item: Relatórios PDF — ✅ Concluído

- `/dashboard/relatorios` — filtros por período (mês / 90 dias / ano / tudo), KPIs, tabelas de pedidos, top clientes e estoque
- `/api/relatorios` — GET com `?periodo=mes|trimestre|ano|tudo`, protegido por sessão
- PDF via `window.print()` — mesmo padrão dos orçamentos; `@media print` oculta controles e exibe cabeçalho do relatório

---

### Fase 3 — ✅ CONCLUÍDA

| Prioridade | Item | Status | Observação |
|------------|------|--------|------------|
| 1 | Portal do cliente | ✅ 100% | Token único por pedido, página pública `/portal/pedido/[token]` |
| 2 | CRM leve | ✅ 100% | Pipeline kanban PROSPECTO → NEGOCIACAO → FECHADO/PERDIDO, drag and drop |

#### Portal do cliente

- Campo `tokenPortal` (único) adicionado ao model `Pedido`
- `POST /api/pedidos/[id]/token-portal` — gera/regenera token (requer sessão)
- `GET /api/portal/pedido/[token]` — rota pública, retorna dados sem valores nem arquivos
- `app/(portal)/portal/pedido/[token]/page.tsx` — página server-side com status, itens, histórico em timeline
- Botão "Gerar link do portal" na página de detalhe do pedido — copia URL para clipboard

#### CRM leve

- Model `Lead` com enum `EtapaLead` (PROSPECTO, NEGOCIACAO, FECHADO, PERDIDO)
- `GET/POST /api/leads` e `GET/PATCH/DELETE /api/leads/[id]`
- `/dashboard/crm` — kanban com 4 colunas, receita por etapa, mover lead entre etapas, modal criar/editar

---

## Módulos Stand-by

### NF-e (nfewizard-io)

> Aguardando migração para Railway. Incompatível com Vercel (requer sistema de arquivos e conexão SEFAZ persistente).

MEI ativo desde 2024, certificado A1 adquirido, credenciamento SEFAZ pendente.

```
XML gerado → assinado com certificado A1 → transmitido SEFAZ → protocolo → DANFE PDF
```

- `npm install nfewizard-io` · Variáveis: `NFE_CERT_PATH`, `NFE_CERT_SENHA`, `NFE_CNPJ`
- Rotas a criar: `POST /api/pedidos/[id]/nfe`, `DELETE /api/nfe/[id]`
- Schema: adicionar model `NotaFiscal` ao Prisma
- Consultar contador: CFOP, CST e alíquotas corretas para a 3D Sinc

### App Nativo (React Native)

> Repositório separado. Reutiliza toda a API REST existente. Aguardando volume que justifique o desenvolvimento.

---

## Módulo Stand-by — Monitoramento de Impressoras Bambu Lab

> Aguardando viabilidade de aquisição do hardware. Não bloqueia o roadmap.

### Arquitetura

```
Bambu Lab (MQTT local) → Raspberry Pi (bridge) → API REST → Dashboard "Impressoras ao vivo"
```

### Dados disponíveis via MQTT

Status, progresso %, tempo restante, temperaturas (bico/mesa/câmara), filamento/AMS, velocidade, erros, câmera.

### Hardware estimado: R$750–1.100

| Item | Estimativa |
|------|-----------|
| Raspberry Pi 4 (4GB) | R$400–550 |
| microSD 32GB + Fonte + Case | R$140–240 |
| Waveshare UPS HAT + baterias 18650 | R$190–280 |
| Cabo Cat5e | R$20–30 |
| Energia elétrica (mensal) | ~R$8–12 |

### Resiliência a queda de energia

1. **UPS HAT** — shutdown seguro (~30 min bateria)
2. **EEPROM Pi** — religar automático: `POWER_OFF_ON_HALT=1`, `WAKE_ON_GPIO=1`
3. **systemd** — `Restart=always` no serviço de bridge

### Script bridge (Python)

```python
# pip install bambulabs-api
import bambulabs_api as bl, time

printer = bl.Printer('192.168.1.xxx', 'ACCESS_CODE', 'SERIAL')
printer.connect()
while True:
    status = printer.get_state()
    # TODO: expor via API REST para o Next.js consumir
    time.sleep(5)
```

### Estratégia de controle

**Atual — Opção 1 (somente leitura):** Developer Mode desativado. Bambu Handy funciona normalmente. Sistema exibe status em tempo real.

**Futuro — Opção 2/3 (controle total):** Ativar Developer Mode por impressora individualmente. Ganha: iniciar/pausar/cancelar remotamente, fila integrada ao ERP. Trade-off: Bambu Handy para de funcionar na impressora afetada.
