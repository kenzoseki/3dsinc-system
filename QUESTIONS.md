# QUESTIONS.md — Revisão Técnica Completa do 3D Sinc

> Revisão feita arquivo por arquivo, endpoint por endpoint, página por página.
> Cada item é uma pergunta independente para você responder com: o que fazer, se é bug ou comportamento intencional, e a prioridade.

---

## 1 — SEGURANÇA

### Q1.1 — Ausência de autorização por recurso nos endpoints de Pedidos

`GET /api/pedidos/[id]` retorna qualquer pedido para qualquer usuário autenticado. Um OPERADOR pode ver pedidos que não são seus, e um VISUALIZADOR também. O mesmo vale para `GET /api/pedidos/[id]/arquivos` e `GET /api/pedidos/[id]/arquivos/[arquivoId]` — qualquer usuário autenticado pode baixar qualquer arquivo de qualquer pedido se souber o ID.

**Isso é intencional (todos na empresa podem ver tudo) ou deveria haver row-level security (ex: OPERADOR só vê pedidos que criou)?**

**Decisão:** Melhoria futura
**Prioridade:** Backlog
**O que fazer:** O Visualizador e o Operador devem apenas visualizar os pedidos e não gerar/alterar nada.

---

### Q1.2 — Ausência de CSRF explícito em rotas state-changing

O `proxy.ts` valida JWT para autenticação, mas nenhuma rota POST/PATCH/DELETE valida token CSRF. O NextAuth gera um `csrf-token` cookie, mas as API routes não o verificam. Um site malicioso poderia forjar requests se o usuário estiver logado.

**Devemos adicionar validação de CSRF nos endpoints que alteram dados, ou o padrão SameSite cookie do NextAuth já é suficiente para o cenário de uso?**

**Decisão:** Bug
**Prioridade:** Crítica
**O que fazer:** Adicione validador CSRF para impedir acessos maliciosos.

---

### Q1.3 — Validação de imagem apenas no client-side (BotaoSugestao)

O `BotaoSugestao.tsx` valida tipo MIME e tamanho (4 MB) no frontend, mas o backend em `/api/sugestoes` só valida `.max(5_300_000)` no string base64. Um atacante pode enviar qualquer conteúdo (não-imagem, HTML, SVG com XSS) via DevTools/curl.

**Devemos adicionar validação server-side do MIME type (verificar magic bytes do base64) e rejeitar tipos que não sejam image/*?**

**Decisão:** Bug
**Prioridade:** Crítica
**O que fazer:** Sim

---

### Q1.4 — Sem rate limiting em nenhum endpoint

Não existe rate limiting em nenhuma rota da API. Um atacante poderia:
- Fazer brute-force no login (`/api/auth`)
- Criar milhares de sugestões (`POST /api/sugestoes`)
- Gerar tokens de portal indefinidamente (`POST /api/pedidos/[id]/token-portal`)
- Sobrecarregar a IA (`POST /api/ia/chat`)

**Qual a estratégia desejada? Rate limit global no proxy? Por rota? Por IP? Por usuário? Usar headers (`X-RateLimit-*`) ou apenas bloquear?**

**Decisão:** Bug
**Prioridade:** Crítica
**O que fazer:** Cada IP pode fazer 30 requisições por hora

---

### Q1.5 — Sem headers de segurança no next.config.ts

O `next.config.ts` está vazio. Não há Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, nem HSTS.

**Devemos adicionar security headers via `next.config.ts` → `headers()`? Alguma restrição específica (ex: permitir iframes de algum domínio)?**

**Decisão:** Bug
**Prioridade:** Crítica
**O que fazer:** Sim, adicione.

---

### Q1.6 — Token JWT sem expiração explícita

Em `lib/auth.ts`, a config de sessão usa `strategy: 'jwt'` mas não define `maxAge`. O NextAuth usa 30 dias por padrão. Se um usuário for desativado, o JWT continua válido por até 30 dias (mitigado parcialmente pelo re-fetch de cargo no session callback).

**30 dias é aceitável? Devemos reduzir para algo como 24h ou 7 dias? Ou implementar uma blacklist de tokens?**

**Decisão:** Melhoria futura
**Prioridade:** Média
**O que fazer:** 30 dias é aceitável por ser um sistema interno de gestão. Porém implemente uma blacklist de tokens para quando desativar/ativar e/ou excluir o usuário do sistema. Além disso, desenvolva um botão ao lado de desativar usuário para exclusão do usuário do sistema.

---

### Q1.7 — Senha padrão do seed em texto no código

`prisma/seed.ts` tem `admin123` hardcoded como senha do admin inicial.

**Isso é apenas para dev/staging ou vai para produção? Devemos forçar troca de senha no primeiro login (o campo `primeiroAcesso` existe mas não sei se é usado para isso)?**

**Decisão:** 
**Prioridade:** 
**O que fazer:** 

---

### Q1.8 — Erro diferenciado no login expõe existência de usuário

Em `lib/auth.ts`, o `authorize` retorna "Usuário não encontrado ou inativo" vs "Senha incorreta" — são mensagens diferentes. Um atacante pode enumerar emails válidos testando combinações.

**Devemos unificar para uma única mensagem genérica tipo "Credenciais inválidas"?**

---

### Q1.9 — XSS potencial nos templates de email

Em `lib/email.ts`, os dados de filamento e pedido são interpolados diretamente no HTML do email sem escaping. Se um nome de filamento contiver `<script>` ou entidades HTML, o email renderiza isso.

**Devemos sanitizar/escapar valores antes de interpolar no HTML dos emails?**

---

### Q1.10 — Exclusão de pedido não remove ArquivoPedido

Em `DELETE /api/pedidos/[id]`, a transaction deleta `historicoPedido` e `itemPedido`, mas não deleta `arquivoPedido`. Os arquivos ficam órfãos no banco.

**Bug? Devemos adicionar `prisma.arquivoPedido.deleteMany({ where: { pedidoId: id } })` na transaction?**

---

### Q1.11 — Rotas públicas no proxy.ts são prefix-matched

`ROTAS_PUBLICAS_API` usa `pathname.startsWith('/api/portal')`. Qualquer rota futura que comece com `/api/portal` (ex: `/api/portal-admin`) seria automaticamente pública sem autenticação.

**Devemos usar matches mais específicos (ex: `/api/portal/pedido`) em vez de prefixos genéricos?**

---

## 2 — BANCO DE DADOS E PRISMA

### Q2.1 — Todos os arquivos binários armazenados como base64 no banco

`ArquivoPedido.conteudoBase64`, `ImagemItemOrcamento.imagemBase64`, `ConfiguracaoEmpresa.logoBase64`, `Sugestao.imagemBase64`, e `Usuario.avatarUrl` (quando base64) — tudo em `@db.Text` no PostgreSQL. Base64 tem overhead de ~33% sobre o binário original, e o Neon Free tem limite de 512 MB.

**Há planos de migrar para object storage (S3, R2, Vercel Blob)? Ou o volume de dados é baixo o suficiente para manter no banco por enquanto?**

---

### Q2.2 — Sem índices explícitos em campos frequentemente filtrados

O schema não define `@@index` em campos usados em WHERE: `Pedido.status`, `Pedido.clienteId`, `Filamento.ativo`, `Lead.etapa`, `Orcamento.status`, `Sugestao.status`, `AlertaEstoque.lido`, `Convite.usado`. O Prisma cria índices automáticos para `@unique` e `@relation`, mas não para campos usados em filtros.

**Devemos adicionar `@@index` nesses campos para otimizar queries conforme os dados crescem?**

---

### Q2.3 — Sem soft delete em nenhum model

Pedidos, clientes, orçamentos, leads e sugestões são hard-deleted. Uma vez excluído, o histórico é perdido para sempre.

**Devemos implementar soft delete (`deletedAt DateTime?`) pelo menos nos models críticos (Pedido, Cliente, Orcamento)? Ou o volume é pequeno o suficiente para não justificar?**

---

### Q2.4 — Duplicação de clientes por nome no sync Lead→Cliente e Orcamento→Cliente

Tanto `POST /api/leads` quanto `POST /api/orcamentos` sincronizam com a tabela Cliente. Quando não há CPF/CNPJ, ambos usam busca por nome (`findFirst({ where: { nome } })`). Se o nome tiver variação mínima ("João Silva" vs "João silva" vs "Joao Silva"), cria duplicatas.

**Devemos usar busca case-insensitive? Ou normalizar o nome (trim + lowercase) antes de comparar? Ou simplesmente não sincronizar quando não há CPF/CNPJ?**

---

### Q2.5 — Campo `cpfCnpj` é `@unique` mas nullable — permite múltiplos NULLs

No PostgreSQL, `UNIQUE` permite múltiplos NULLs. Isso significa que vários clientes podem ter `cpfCnpj: null` sem conflito. Mas dois clientes com o mesmo CPF real deveriam conflitar.

**Esse comportamento é intencional? Muitos clientes pessoa física podem não ter CPF cadastrado?**

---

### Q2.6 — Orcamento tem dados do cliente desnormalizados

`Orcamento` tem `clienteNome`, `clienteEmail`, etc. duplicados da tabela `Cliente`. Se o cliente atualizar seu nome, orçamentos antigos mostram o nome antigo.

**Isso é intencional (preservar histórico/snapshot do momento do orçamento) ou deveria ser normalizado (usar `clienteId` e join)?**

---

### Q2.7 — Sem versionamento temporal em Filamento.pesoAtual

`pesoAtual` é atualizado in-place. Não há registro de quando o peso mudou, quem mudou, ou quanto consumiu.

**Devemos criar um model `HistoricoFilamento` para rastrear mudanças de peso? Ou o `AlertaEstoque` já cobre o necessário?**

---

### Q2.8 — Cascade delete em ItemOrcamento e ImagemItemOrcamento mas não em ItemPedido

`ItemOrcamento` tem `onDelete: Cascade` (deletar orçamento deleta itens). Mas `ItemPedido` não tem cascade — o `DELETE /api/pedidos/[id]` precisa deletar manualmente. `ArquivoPedido` tem `onDelete: Cascade` mas não é usado na transaction.

**Devemos padronizar? Adicionar `onDelete: Cascade` em `ItemPedido` e `HistoricoPedido` também?**

---

### Q2.9 — Session callback faz query ao banco em TODA request

Em `lib/auth.ts`, o callback `session()` faz `prisma.usuario.findUnique()` em cada request que chama `getServerSession()`. Isso é intencional para refletir mudanças de cargo em tempo real, mas multiplica queries por N requests.

**Devemos cachear o resultado por X segundos (ex: 60s) em memória ou Redis? Ou o volume de requests é baixo o suficiente?**

---

## 3 — ARQUITETURA E PADRÕES DE CÓDIGO

### Q3.1 — 100% inline styles, nenhum CSS module ou Tailwind utilizado

Todas as páginas e componentes usam `style={{}}` inline. O `package.json` tem Tailwind como devDependency e `globals.css` define classes utilitárias, mas nenhum componente React as usa. Isso resulta em:
- Componentes com 300+ linhas de styles misturados com lógica
- Impossibilidade de usar pseudo-selectors (:hover nativo, :focus-visible)
- Styles não podem ser cacheados pelo browser (inline = recriados a cada render)
- Hover/focus implementados via onMouseEnter/onMouseLeave (JS em vez de CSS)

**Devemos migrar para Tailwind (já instalado), CSS Modules, ou manter inline styles? Qual a preferência?**

---

### Q3.2 — Sem error boundary em nenhuma página

Nenhuma página ou layout tem `error.tsx` (Next.js App Router error boundary). Se um componente crashar, o usuário vê tela branca.

**Devemos criar `app/error.tsx` e `app/(dashboard)/error.tsx` com UI de fallback?**

---

### Q3.3 — Sem loading.tsx em rotas dinâmicas

Nenhuma rota usa `loading.tsx` (Next.js suspense boundary). Navegação entre páginas não mostra skeleton/spinner nativo.

**Devemos adicionar `loading.tsx` pelo menos nas rotas principais (dashboard, pedidos, orcamentos)?**

---

### Q3.4 — Sem testes automatizados

Zero testes unitários, de integração, ou E2E. Nenhum arquivo `.test.ts`, `.spec.ts`, nem configuração de Jest/Vitest/Playwright.

**Há planos de adicionar testes? Se sim, qual a prioridade — unit tests nos API routes, E2E nos fluxos críticos, ou ambos?**

---

### Q3.5 — Componente LayoutShell.tsx com 400+ linhas

`LayoutShell.tsx` contém sidebar, topbar, dropdown do usuário, navegação, responsividade — tudo em um arquivo. Difícil de manter e testar.

**Devemos extrair em componentes menores (Sidebar, Topbar, UserDropdown, NavGroup)?**

---

### Q3.6 — Páginas de formulário (novo pedido, novo orçamento) com 500+ linhas

As páginas de criação de pedido e orçamento são monólitos com estado de formulário, validação, chamadas API, e UI tudo junto.

**Devemos extrair hooks customizados (ex: `useFormPedido`) e/ou componentes de formulário reutilizáveis?**

---

### Q3.7 — `unstable_cache` usado em produção

`lib/erp-context.ts` e `app/(dashboard)/layout.tsx` usam `unstable_cache` do Next.js, que é experimental e pode mudar/quebrar em versões futuras.

**Devemos migrar para uma alternativa estável (React `cache()`, manual Redis, ou `fetch` com revalidate)?**

---

### Q3.8 — Sem API documentation (OpenAPI/Swagger)

30 endpoints sem documentação formal. Novos desenvolvedores precisam ler o código para entender cada rota.

**Devemos gerar OpenAPI spec ou pelo menos um documento markdown com os endpoints?**

---

### Q3.9 — Fetch nativo sem wrapper/interceptor

Todas as páginas usam `fetch()` diretamente com `try/catch` repetido. Não há tratamento centralizado de 401 (redirect para login), retry, ou logging.

**Devemos criar um wrapper `apiFetch()` que lide com erros comuns, redirect em 401, e tipagem genérica?**

---

### Q3.10 — Sem health check endpoint

Não existe `/api/health` para monitoramento. Se o banco cair, não há como detectar programaticamente.

**Devemos criar um endpoint `/api/health` que verifica conexão com o banco e retorna status?**

---

## 4 — PERFORMANCE

### Q4.1 — N+1 query em GET /api/filamentos/[id]

O endpoint retorna `itensPedido` com `pedido` e `cliente` nested para cada item. Se um filamento for usado em 100 pedidos, são 100 sub-queries.

**Devemos limitar o número de `itensPedido` retornados (ex: últimos 20) ou paginar?**

---

### Q4.2 — GET /api/pedidos/[id] carrega tudo sem limites

Retorna todos os `historico`, `arquivos`, e `itens` em uma única query. Pedidos antigos com muito histórico ou muitos arquivos geram payloads grandes.

**Devemos paginar histórico e arquivos separadamente?**

---

### Q4.3 — Dashboard principal (page.tsx) faz muitas queries paralelas no servidor

A página do dashboard é um Server Component que faz ~8 queries paralelas (pedidos, orçamentos, clientes count, filamentos count, alertas, etc.) em cada load.

**Isso é aceitável (são queries simples) ou devemos cachear os KPIs com `unstable_cache`/revalidate?**

---

### Q4.4 — Orçamento PDF via window.print() renderiza tudo inline

O PDF do orçamento é gerado via `window.print()` com `@media print`. Funciona, mas imagens base64 grandes dentro de itens podem travar o browser na impressão.

**Devemos limitar tamanho/resolução das imagens inline ou considerar geração server-side (puppeteer, react-pdf)?**

---

### Q4.5 — Service Worker cache nunca expira

O `public/sw.js` usa cache versão `v1` hardcoded. Assets cacheados nunca são invalidados automaticamente — o usuário precisa fechar todas as abas para atualizar.

**Devemos usar hash-based versioning ou timestamp no cache name?**

---

### Q4.6 — Busca de clientes usa `contains` com `mode: insensitive`

`GET /api/clientes` faz `contains` com `mode: 'insensitive'` em nome, empresa e email. No PostgreSQL, `ILIKE` não usa índice B-tree por padrão.

**Devemos adicionar `@@index` com `ops: raw("gin_trgm_ops")` para otimizar busca textual? Ou o volume de clientes é pequeno o suficiente?**

---

## 5 — UX E FRONTEND

### Q5.1 — Sem feedback de navegação (loading indicator)

Quando o usuário clica em um item na sidebar, não há indicação visual de que a página está carregando. O Next.js App Router faz client-side navigation mas sem spinner.

**Devemos usar `useTransition` + um indicador global (barra de progresso no topo)?**

---

### Q5.2 — Modais não fecham com Escape

Nenhum modal (BotaoSugestao, Novo Cliente, Novo Lead) pode ser fechado com a tecla Escape. Apenas click-outside funciona.

**Devemos adicionar `onKeyDown` listener para Escape em todos os modais?**

---

### Q5.3 — Sem `prefers-reduced-motion` nos CSS animations

`globals.css` define várias animações (fadeUp, bounce, spin, pulse-ring) mas não respeita a preferência do usuário por movimento reduzido.

**Devemos adicionar `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`?**

---

### Q5.4 — Sem dark mode

O design system inteiro assume tema claro (creme natural). Não há toggle nem detecção de `prefers-color-scheme: dark`.

**Dark mode está nos planos? Se sim, qual a prioridade?**

---

### Q5.5 — Números na sidebar (1, 2, 3...) em vez de ícones semânticos

A sidebar usa números sequenciais como ícones de navegação. Isso funciona mas perde a associação visual — o usuário precisa ler o label para saber o que cada item é.

**Devemos trocar para ícones SVG/emoji semânticos (📦 Pedidos, 📄 Orçamentos, 👥 Clientes) ou os números são preferidos?**

---

### Q5.6 — Kanban (CRM e Orçamentos) sem scroll horizontal em mobile

Os kanbans usam `gridTemplateColumns: 'repeat(4, 1fr)'`. Em telas pequenas, as colunas ficam espremidas (cada uma com ~25% da largura).

**Devemos adicionar scroll horizontal com `overflow-x: auto` e largura fixa por coluna em mobile?**

---

### Q5.7 — Tabelas não são responsivas

As tabelas de Clientes, Pedidos, e Estoque não têm tratamento mobile. Colunas ficam cortadas ou exigem scroll horizontal sem indicador.

**Devemos usar card-layout em mobile (empilhar campos verticalmente) ou adicionar scroll horizontal com indicador visual?**

---

### Q5.8 — Sem confirmação visual após ações destrutivas

Deletar um lead, cliente, ou pedido mostra apenas `confirm()` nativo do browser. Não há toast/snackbar confirmando que a ação foi realizada.

**Devemos implementar um sistema de toasts para feedback de ações (sucesso, erro, info)?**

---

### Q5.9 — Campo de busca em Pedidos não existe

A listagem de Pedidos tem filtro por status e paginação, mas não tem campo de busca por texto (nome do cliente, descrição, número).

**Devemos adicionar busca textual similar à de Clientes?**

---

### Q5.10 — Página de Produção não pagina e não filtra por prioridade

A fila de produção carrega todos os pedidos AGUARDANDO e EM_PRODUCAO sem paginação. Também não há filtro por prioridade (URGENTE primeiro).

**Devemos adicionar ordenação por prioridade como padrão e paginação se a lista crescer?**

---

## 6 — LÓGICA DE NEGÓCIO

### Q6.1 — Fluxo de status do Pedido não é validado no backend

O schema Zod aceita qualquer transição de status (ex: ORCAMENTO → ENTREGUE direto). A única validação é APROVADO exigir orçamento APROVADO. Um request direto poderia pular etapas.

**Devemos implementar uma state machine no backend que valide transições permitidas (ex: EM_PRODUCAO só pode ir para PAUSADO, CONCLUIDO, ou CANCELADO)?**

---

### Q6.2 — PATCH /api/orcamentos/[id] deleta e recria todos os itens

Ao atualizar um orçamento, o endpoint faz `deleteMany` em todos os itens e depois cria novos. Isso perde o ID original dos itens — se algum outro sistema referenciasse um `ItemOrcamento.id`, o link quebraria.

**Isso é aceitável (nenhum sistema externo referencia ItemOrcamento) ou devemos fazer upsert (atualizar existentes, criar novos, deletar removidos)?**

---

### Q6.3 — Cron de alertas não é idempotente para pedidos atrasados

`GET /api/cron/alertas` verifica pedidos com `prazoEntrega < now()` e `status IN (AGUARDANDO, EM_PRODUCAO)` e envia email. Mas não marca o pedido como "alerta enviado" — se o cron rodar novamente (retry, erro parcial), o mesmo pedido gera emails duplicados.

**Devemos adicionar um campo `alertaAtrasadoEnviado` no Pedido, ou um model `AlertaPedido` similar ao `AlertaEstoque`?**

---

### Q6.4 — Lead sem vínculo com Cliente após sync

O `POST /api/leads` cria/atualiza um Cliente, mas não armazena o `clienteId` no Lead. Não há como saber qual Lead gerou qual Cliente depois.

**Devemos adicionar `clienteId` opcional no model Lead para rastrear a origem?**

---

### Q6.5 — Orçamento EXPIRADO é um status no enum mas não tem lógica automática

`StatusOrcamento` inclui `EXPIRADO`, mas nenhum cron ou lógica automática muda orçamentos para EXPIRADO quando passam do `validadeDias`.

**Devemos implementar lógica automática (cron ou check no GET) para expirar orçamentos? Ou isso é manual?**

---

### Q6.6 — Campo `primeiroAcesso` no Usuario não parece ser utilizado

O model `Usuario` tem `primeiroAcesso: Boolean @default(true)`, mas nenhum endpoint ou página parece verificar ou atualizar esse campo.

**Qual era a intenção? Forçar troca de senha no primeiro login? Mostrar onboarding? Devemos implementar ou remover?**

---

### Q6.7 — `tokenPortal` é gerado mas nunca expira

O token do portal do cliente é gerado uma vez e permanece válido para sempre. Se o link vazar, qualquer pessoa pode ver o status do pedido indefinidamente.

**Devemos adicionar expiração ao tokenPortal ou permitir revogação manual?**

---

### Q6.8 — Assistente IA não tem limite de uso por usuário

Qualquer OPERADOR+ pode usar o chat IA sem limite de mensagens. Cada mensagem faz uma chamada à API Anthropic que tem custo.

**Devemos implementar um limite diário de mensagens por cargo/usuário? Ou o custo é insignificante no volume atual?**

---

## 7 — DEVOPS E INFRAESTRUTURA

### Q7.1 — Sem validação de variáveis de ambiente no startup

Se `DATABASE_URL`, `NEXTAUTH_SECRET`, ou `ANTHROPIC_API_KEY` estiverem ausentes, o app crasha em runtime sem mensagem clara.

**Devemos criar um `lib/env.ts` que valida todas as env vars necessárias no startup com mensagens claras?**

---

### Q7.2 — Sem endpoint de health check

Não existe `/api/health` para monitoramento. Vercel, uptime monitors, e load balancers não têm como verificar se o app está saudável.

**Devemos criar um `/api/health` que testa conexão com o banco e retorna `{ status: 'ok', db: 'connected' }`?**

---

### Q7.3 — Vercel cron timezone pode variar com horário de verão

O cron `"0 11 * * *"` em `vercel.json` assume UTC fixo. O Brasil não observa mais horário de verão (desde 2019), mas se voltar, o alerta rodaria no horário errado.

**Isso é aceitável? Ou devemos documentar a assunção de UTC-3 fixo?**

---

### Q7.4 — Sem CI/CD pipeline visível

Não há `.github/workflows`, `Makefile`, ou scripts de CI. Build e deploy parecem ser feitos via push direto para `main` → Vercel auto-deploy.

**Devemos adicionar CI com lint, type-check, e build antes de deploy? Testes quando existirem?**

---

### Q7.5 — Sem logging estruturado

Todos os logs são `console.error('Erro ao X:', erro)` — não há structured logging (JSON), correlation IDs, ou níveis de log.

**Devemos implementar um logger (pino, winston) com JSON output para melhor observabilidade em produção?**

---

### Q7.6 — Sem monitoramento de erros (Sentry, etc.)

Erros em produção são perdidos em `console.error`. Não há Sentry, Bugsnag, ou similar para capturar e alertar sobre erros.

**Devemos integrar um serviço de error tracking?**

---

## 8 — PWA E SERVICE WORKER

### Q8.1 — Cache do Service Worker nunca é invalidado

`public/sw.js` usa `CACHE_NAME = 'v1'` hardcoded. Não há mecanismo de invalidação automática — a única forma de forçar update é alterar o arquivo `sw.js`.

**Devemos usar versionamento baseado em hash do build?**

---

### Q8.2 — Sem indicador de modo offline

Quando o usuário perde conexão, o SW serve páginas cacheadas mas a UI não indica que está offline. O usuário pode tentar salvar dados e receber erro silenciosamente.

**Devemos adicionar um banner "Você está offline" quando `navigator.onLine === false`?**

---

### Q8.3 — Requests falhados offline não são retentados

Se o usuário submeter um formulário offline, o request falha e é perdido. Não há background sync para retentar quando a conexão voltar.

**Devemos implementar background sync para operações críticas (criar pedido, atualizar status)?**

---

## 9 — QUALIDADE DE CÓDIGO

### Q9.1 — Tailwind instalado mas não utilizado

`package.json` tem `tailwindcss` e `@tailwindcss/postcss` como devDependencies, mas nenhum componente usa classes Tailwind. Isso adiciona peso ao toolchain sem benefício.

**Devemos remover Tailwind do projeto ou migrar os inline styles para ele?**

---

### Q9.2 — `@auth/prisma-adapter` e `@prisma/adapter-neon` instalados mas não usados

O `package.json` inclui `@auth/prisma-adapter` e `@prisma/adapter-neon` + `@neondatabase/serverless`, mas `lib/auth.ts` não usa adapter (usa CredentialsProvider direto) e `lib/db.ts` cria um `PrismaClient` padrão sem adapter Neon.

**Devemos remover essas dependências não utilizadas ou há plano de usá-las?**

---

### Q9.3 — Tipagem fraca em vários pontos

- `session.user.cargo as Cargo` — cast forçado em vez de tipagem correta
- `form[campo as keyof typeof form]` — cast genérico em vez de tipo específico
- `dados.status as StatusPedido` — cast desnecessário se o Zod já tipasse
- `searchParams.get('status') as StatusPedido | null` — cast sem validação

**Devemos refatorar para eliminar `as` casts e usar type guards/Zod para garantir tipos em runtime?**

---

### Q9.4 — Sem tratamento de erro padronizado

Cada endpoint tem seu próprio `try/catch` com `console.error` + `NextResponse.json({ erro: ... }, { status: 500 })`. Repetição de ~10 linhas por endpoint.

**Devemos criar um helper `withErrorHandler(handler)` que wrapa a lógica e padroniza o tratamento de erro?**

---

### Q9.5 — Import de `Cargo` do Prisma em componentes client-side

`LayoutShell.tsx`, `crm/page.tsx`, e outros importam `Cargo` de `@prisma/client` em componentes `'use client'`. Isso puxa o Prisma client bundle para o browser.

**O Next.js faz tree-shaking nesse caso, ou devemos criar um `types/cargo.ts` separado para não importar Prisma no client?**

---

### Q9.6 — Repetição do padrão de modal em 4 páginas

Os modais de Clientes, CRM (Leads), BotaoSugestao, e Novo Membro (Equipe) repetem o mesmo padrão: overlay fixo, div centralizada, botão fechar, form com inputs estilizados.

**Devemos extrair um componente `<Modal>` reutilizável?**

---

## 10 — FUNCIONALIDADES AUSENTES OU INCOMPLETAS

### Q10.1 — Sem busca global (search bar)

Não há funcionalidade de busca global que pesquise em pedidos, clientes, orçamentos e leads ao mesmo tempo.

**Isso é desejável? Se sim, barra de busca no topbar com resultados agrupados?**

---

### Q10.2 — Sem notificações in-app

Alertas de estoque baixo e pedidos atrasados só existem via email (cron). Não há indicador no dashboard de "X alertas não lidos".

**Devemos mostrar alertas não lidos no topbar (badge/sino)?**

---

### Q10.3 — Sem audit log

Não há registro de quem fez o quê e quando (exceto `HistoricoPedido` para mudanças de status). Alterações em clientes, orçamentos, estoque, equipe não são rastreadas.

**Devemos criar um model `AuditLog` genérico (userId, ação, entidade, entityId, dados, createdAt)?**

---

### Q10.4 — Sem exportação de dados (CSV/Excel)

Nenhuma listagem permite exportar dados. O relatório usa `window.print()` para PDF mas não há CSV.

**Devemos adicionar botão "Exportar CSV" nas listagens de pedidos, clientes, e orçamentos?**

---

### Q10.5 — Sem paginação na listagem de Leads

`GET /api/leads` retorna todos os leads sem paginação. Se houver centenas de leads, o payload será grande.

**Devemos adicionar paginação ao GET de leads?**

---

### Q10.6 — Sem paginação na listagem de Sugestões

`GET /api/sugestoes` retorna todas as sugestões sem paginação ou limite.

**Devemos adicionar paginação?**

---

### Q10.7 — Assistente IA não persiste histórico entre sessões

O chat do assistente IA perde todo o histórico quando o usuário sai da página. Não há persistência no banco.

**Devemos salvar conversas do chat no banco para consulta futura?**

**Decisão:** 
**Prioridade:** 
**O que fazer:** 

---

---

## Como responder

Para cada pergunta, responda no formato:

```
### Q1.1
**Decisão:** [Bug / Intencional / Melhoria futura / Não fazer]
**Prioridade:** [Crítica / Alta / Média / Baixa / Backlog]
**O que fazer:** [Descrição curta da ação]
```

Após suas respostas, implementarei as mudanças baseadas nas decisões.
