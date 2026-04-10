# Melhorias e Correções — 3D Sinc

## Implementado

### Lote 1 (commit ce9ef12)
- Filtros no Dashboard com lentidão → `useTransition` + `router.replace`
- Cadastro de orçamento: separação dos campos obrigatórios, placeholders em dados sensíveis, validador de email
- Permissões dos usuários refletem em tempo real (session callback re-busca cargo do banco)
- Permissões CRUD do VISUALIZADOR limitadas no frontend e backend
- Função de Esqueci Minha Senha na /login (HMAC stateless + Resend)
- Vincular campos de Cliente existentes em Orçamentos
- Liberar convite para Sócio; alteração de cargo limitada a Gerente, Operador e Visualizador
- Página de Acessos e Permissões em /configuracoes/permissoes (ADMIN e Sócio)
- Pop-ups de Novo Lead e Novo Membro centralizados com click-outside-to-close
- Estoque: ordenado por data de cadastro, filtro de percentual, toggle ativo removido do editar, filtro ativo/inativo, alerta na criação com baixo estoque

### Lote 2 (commit 4869deb)
- ORÇAMENTOS:
    - Filtros: "Enviado" renomeado para "Andamento"
    - Filtro "Expirado" removido
    - Seletor de cliente: ao selecionar "Preencher manualmente", zera todos os campos do formulário
    - Obrigatoriedade: nome do cliente + ao menos 1 produto com valor para criar/enviar orçamento
    - Botão "Kanban" na listagem que abre sub-página `/orcamentos/kanban` com visão por status
- SIDEBAR:
    - Ícones numerados sequencialmente (①②③...) de cima para baixo
- CRM:
    - Transformado de pipeline de Leads para pipeline de Orçamentos (kanban com drag & drop por status)
- CLIENTES:
    - Sincronização automática: ao criar orçamento, o cliente é cadastrado/atualizado na tabela de Clientes (upsert por CPF/CNPJ ou nome)
    - Pedidos já sincronizavam via seleção obrigatória de cliente
- POP-UPS:
    - Modal de Novo Cliente com `maxHeight: 90vh` e `overflowY: auto` para não cortar campos em telas menores
- FAB DE SUGESTÕES:
    - Botão flutuante (canto inferior direito) para enviar melhorias e bugs
    - Modal com seletor de tipo, título, descrição e upload de imagem
    - API `/api/sugestoes` (CRUD) com validação Zod
    - Página `/dashboard/sugestoes` para ADMIN/SOCIO gerenciar sugestões

### Lote 3 (commit 57804e8)
- CRM:
    - Revertido para pipeline de Leads (PROSPECTO → NEGOCIAÇÃO → FECHADO → PERDIDO)
    - Sincronização automática Lead → Cliente ao criar lead (upsert por nome)
    - Modal de criar/editar lead no padrão centralizado
- MODAIS:
    - Modal de Novo Cliente (Clientes) e Novo Lead (CRM) padronizados: overlay escuro, div centralizada, boxShadow, focus/blur nos inputs — mesmo estilo do modal de Sugestões
- SUGESTÕES:
    - Botão de upload de imagem abaixo da Descrição (máx. 4 MB, pré-visualização com remoção)
    - Campo `imagemBase64` no model Sugestao e na API
    - Página admin exibe imagens anexadas nas sugestões
- SIDEBAR:
    - Números trocados de ①②③ para 1, 2, 3 com badges estilizadas (fundo roxo quando ativo)

### Lote 4 (commit atual)
- SIDEBAR:
    - Páginas CRM, Workspace, Produção, Estoque e Assistente IA visíveis apenas para ADMIN
    - Relatórios, Equipe, Configurações e Sugestões visíveis para todos os cargos (sem guard de sidebar)
    - Workspace adicionado ao grupo Operacional (ícone 6)
- EQUIPE:
    - ADMIN pode alterar cargo de membros para Sócio (opção estava ausente no select)
- CONFIGURAÇÕES > ACESSOS:
    - Matriz de permissões agora é editável (clique nas células para ciclar Total → Leitura → Sem Acesso)
    - ADMIN pode editar todos os cargos; SÓCIO pode editar todos exceto ADMIN
    - Permissões salvas em `ConfiguracaoEmpresa.permissoesJson` via `PATCH /api/configuracoes/permissoes`
- WORKSPACE (NOVO):
    - Página `/dashboard/workspace` com kanban de 5 colunas ativas: Solicitação, Custo e Viabilidade, Aprovação, Produção, Enviado
    - Abas separadas para Finalizado e Cancelado
    - Modal de criação com campos de cliente (nome*, email, telefone, PF/PJ), itens (descrição, qtd, referência) e observações
    - Modal de detalhe com avanço de etapa, edição de informações adicionais e cancelamento
    - Models `Workspace` e `ItemWorkspace` no Prisma; API CRUD em `/api/workspace` e `/api/workspace/[id]`
### Lote 4.1 (correções)
- SIDEBAR: Workspace agora visível para todos os cargos (guard ADMIN removido)
- WORKSPACE: modais de criação e detalhe renderizados via `createPortal(document.body)` para escapar do `overflow` da layout main
- WORKSPACE API: GET liberado para todos os cargos autenticados; POST/PATCH usam `podeEscreverPedidos`; DELETE permanece ADMIN-only

### Lote 5 (commit atual)
- URL:
    - Estrutura alterada: `/dashboard` → `/home` (Início) e `/dashboard/X` → `/workspace/X`
    - Clique no logo redireciona para `/home`
    - Sidebar, proxy.ts, manifest.ts, LoginForm e todas as ~20 páginas internas atualizadas
    - `.next` cache limpo para evitar referências órfãs
- DASHBOARD (agora "Início" em `/home`):
    - Card "Estoque Crítico" substituído por "Workspace Ativos" (solicitações em andamento)
    - Nova seção "Workspace — Fluxo" com barras visuais por etapa (SOL → C&V → APR → PROD → FRETE → ENV) e contagem em tempo real
    - Link "Abrir Workspace →" direto para `/workspace`
- WORKSPACE:
    - Kanban expandido para 6 colunas ativas: Solicitação, Custo e Viabilidade, Aguardando Aprovação, Produção, Cálculo de Frete, Enviado
    - Etapa CALCULO_FRETE adicionada ao enum `EtapaWorkspace` no Prisma (entre PRODUCAO e ENVIADO)
    - Custo e Viabilidade: campos valor unitário (obrigatório para avançar) e custo unitário por item com cálculos de Total, Custo Total e Lucro Líquido
    - Itens editáveis inline na etapa de Solicitação; read-only a partir de Aguardando Aprovação
    - Aguardando Aprovação: 3 botões — Aprovar (→ Produção), Editar Pedido (→ volta para Solicitação), Cancelar Pedido
    - Produção: registra `dataInicioProducao` automaticamente ao entrar; `dataFimProducao` ao avançar para Cálculo de Frete
    - Cálculo de Frete: campo Frete obrigatório para avançar (validação API 422)
    - Enviado: campos data/hora de envio e código de rastreio; botão "Gerar Link Portal" (token via `/api/workspace/[id]/token-portal`); botão "Finalizar" com confirmação
    - Fix delete: botão funcional com try/catch e mensagem de erro; restrito a ADMIN
    - Botão "Ver Orçamento" no detalhe de cada solicitação (link para `/workspace/orcamentos/[id]`)
    - Auto-create na criação: POST `/api/workspace` agora cria automaticamente Cliente (upsert por nome), Orçamento (RASCUNHO) e Pedido (ORCAMENTO) via `$transaction`
    - Sync etapas: PATCH `/api/workspace/[id]` sincroniza etapa → status do Pedido vinculado (ex.: APROVACAO → APROVADO, PRODUCAO → EM_PRODUCAO)
    - Sync itens/frete: ao editar itens ou frete no Workspace, os dados são replicados para o Orçamento vinculado
    - Campos `frete`, `dataInicioProducao`, `dataFimProducao`, `dataEnvio`, `horaEnvio`, `codigoRastreio`, `tokenPortal`, `clienteId`, `pedidoId`, `orcamentoId` adicionados ao model Workspace
    - Campo `custoUnitario` adicionado ao model ItemWorkspace
- PEDIDOS:
    - Sincronizados com Workspace via FK `pedidoId` (status atualizado automaticamente ao mover etapas)
    - Exclusão permitida para ADMIN e SOCIO (antes era só ADMIN)
    - Coluna "Ações" com botão Excluir visível para ADMIN/SOCIO na listagem
- ORÇAMENTOS:
    - Sincronizados com Workspace: itens e frete replicados automaticamente ao editar no Workspace
    - Orçamento criado em RASCUNHO junto com a solicitação
- PRODUÇÃO:
    - Fonte de dados alterada de API de Pedidos para API de Workspace
    - 3 seções: Aguardando Produção (SOL + C&V + APR), Em Produção (PRODUCAO), Produção Finalizada (FRETE + ENV + FINAL)
    - Exibe data de início de produção por solicitação
    - Acesso liberado para todos os cargos (`podeVerProducao` retorna `true` para todos)
    - Guard `soAdmin` removido da sidebar para Produção
- CLIENTES:
    - Sincronizados com Workspace: cliente criado automaticamente na criação da solicitação
    - Modal de criação manual com `createPortal(document.body)` (fix overflow)
- EQUIPE:
    - Botão "Excluir" membro adicionado com hierarquia:
        - ADMIN pode excluir qualquer cargo exceto ADMIN
        - SOCIO pode excluir GERENTE, OPERADOR e VISUALIZADOR
    - DELETE handler em `/api/equipe/[id]` com validação de hierarquia
    - Coluna Ações visível para ADMIN e SOCIO
- LIMPEZA:
    - Script `scripts/limpar-dados.ts` para zerar Pedidos, Orçamentos, Filamentos e Workspaces (respeitando ordem de FK)
    - Dados zerados com sucesso

---

### Lote 6 (commit atual)
- ESTOQUE:
    - Removido da sidebar (link e ícone)
    - Queries e gráficos de filamentos removidos do Dashboard/Home
    - Páginas de estoque mantidas no código mas inacessíveis pela navegação
- WORKSPACE:
    - Editar Dados Avançados do Orçamento: nova página em `/workspace/orcamento/[id]` com editor completo — numeração e revisão editáveis (ORC-XXXX-XX em tempo real), dados do cliente, itens com imagens, financeiro, condições e observações. Botão "Editar Dados Avançados" no modal de detalhe do Workspace (ao lado de "Ver Orçamento"). API PATCH de orçamentos atualizada para aceitar campo `numero`.
    - Nova Solicitação — Autocomplete de Cliente: ao digitar o nome do cliente, busca clientes existentes (fetch `/api/clientes?busca=X&limite=6`) e exibe dropdown de sugestões. Ao selecionar, preenche automaticamente email, telefone e tipo de pessoa. Opção "+ Novo cliente" para preencher manualmente.
    - Prioridade: campo `prioridade` (BAIXA, NORMAL, ALTA, URGENTE) adicionado ao model Workspace. Seletor no formulário de criação. Badge colorido nos cards do Kanban (apenas se diferente de NORMAL). Filtro de prioridade no header do Kanban com ordenação automática (URGENTE > ALTA > NORMAL > BAIXA). Prioridade visível no modal de detalhe.
    - Data de Entrega: campo `dataEntrega DateTime?` adicionado ao model Workspace. Input de data no formulário de criação. Exibida nos cards do Kanban (com destaque vermelho se vencida). Badge no modal de detalhe.
    - AGENDA PRODUÇÃO (NOVO): página `/workspace/agenda-producao` com timeline mensal. Cada solicitação exibe barra colorida da data de criação até o prazo de entrega. Navegação por mês (◀ ▶ Hoje). Marcador vertical do dia atual. Info lateral com número, etapa, cliente e itens. Legenda de etapas por cor. Destaque vermelho para entregas atrasadas.
- MARKETING (NOVO):
    - Schema Prisma: enum `EtapaMarketing` (IDEIA → PLANEJAMENTO → PRODUCAO → REVISAO → AGENDADO → PUBLICADO) e model `CardMarketing` (título, descrição, etapa, plataforma, responsável, dataPublicação, imagemBase64, observações)
    - API CRUD: `GET/POST /api/marketing` e `GET/PATCH/DELETE /api/marketing/[id]` com validação Zod e guards por cargo
    - Kanban (`/workspace/marketing`): 6 colunas com drag & drop (HTML5 Drag API). Cards arrastáveis entre etapas. Modal de criação com título, descrição, plataforma, responsável, data de publicação, observações. Modal de detalhe com edição inline, botões Avançar/Voltar etapa, excluir (ADMIN/SOCIO). Link para Agenda.
    - Agenda Marketing (`/workspace/agenda-marketing`): calendário mensal com grid 7×N. Cards com data de publicação exibidos no dia correspondente, coloridos por etapa. Navegação por mês. Seção "Sem data de publicação" para cards sem data definida.
- SIDEBAR:
    - Grupo "Marketing" adicionado com itens Kanban (9) e Agenda (10)
    - Ícones renumerados: Ferramentas 11-12, Administração 13-15

---

### Lote 7 (commit atual)
- WORKSPACE:
    - Fix dados inválidos ao salvar: Zod schema do PATCH usava `z.number().positive()` que rejeitava 0 e strings Decimal do Prisma. Corrigido para `z.coerce.number().nonnegative()`. Frontend agora converte explicitamente valores com `Number()` antes de enviar.
    - Upload/download de arquivos: seção "Arquivos" no modal de detalhe do Workspace. Upload via FileReader → base64, usa API existente `/api/pedidos/[id]/arquivos`. Lista com nome, tamanho, botões Baixar e Excluir. Limite 10 MB por arquivo.
    - Preview de imagem: botão "Preview" em arquivos de imagem, abre lightbox fullscreen sobre o modal. STL preview não incluído (exigiria three.js — peso desproporcional para o MVP).
- SIDEBAR:
    - Workspace e Relatórios movidos para o grupo "Principal" (Início, Workspace, Relatórios)
    - Operacional simplificado (Produção, Agenda Produção)
    - Agendas renomeadas para "Agenda Produção" e "Agenda Marketing" para clareza
    - Ícones renumerados sequencialmente (1-15)

### Lote 8 — Auditoria QA + Segurança (commit atual)
- PRISMA SCHEMA:
    - `onDelete: Cascade` em 6 relações: Convite→Usuario, ItemPedido→Pedido, HistoricoPedido→Pedido, AlertaEstoque→Filamento, Sugestao→Usuario, ArquivoPedido→Pedido
    - `onDelete: SetNull` em 2 relações: HistoricoPedido→Usuario, ItemPedido→Filamento
    - 7 `@@index` adicionados: Pedido(clienteId, orcamentoId, status), ItemPedido(pedidoId), HistoricoPedido(pedidoId, usuarioId), AlertaEstoque(filamentoId), Workspace(etapa, clienteId, prioridade)
    - `createdAt DateTime @default(now())` adicionado ao ItemPedido
    - `tokenPortalExpira DateTime?` adicionado a Pedido e Workspace
    - Removido `@default(cuid())` do token do Convite (agora gerado via `randomBytes(32)`)
- SEGURANÇA:
    - Token de convite: trocado de `cuid()` para `randomBytes(32).toString('hex')` (64 chars hex, criptograficamente seguro)
    - Token de portal: expiração de 30 dias adicionada (Pedido e Workspace); rota GET do portal valida expiração e retorna 410 se expirado
    - NEXTAUTH_SECRET: removido fallback `'fallback'` em forgot-password e reset-password — agora lança erro se variável ausente
    - Senha mínima: 6 → 8 caracteres em 3 rotas (reset-password, convite/aceitar, perfil)
    - bcrypt: rounds de 10 → 12 em 3 rotas (reset-password, convite/aceitar, perfil)
    - `tamanhoBytes` no upload de arquivos: agora usa valor calculado no servidor (`Math.floor((base64.length * 3) / 4)`) em vez do valor informado pelo cliente
- WORKSPACE:
    - DELETE agora limpa vínculos: nullifica `orcamentoId` do Pedido vinculado antes de excluir
    - Retorna 404 se workspace não existe (antes era erro genérico)
- CLIENTES:
    - DELETE agora verifica Workspaces vinculados além de Pedidos (retorna 409 com mensagem descritiva)
- FRONTEND:
    - `.catch()` adicionado em fetches desprotegidos (configurações, perfil)
    - Resposta verificada em token-portal, DELETE de CRM lead e DELETE de orçamento
- VALIDAÇÕES:
    - NaN guard (`|| default`) em paginação de clientes e orçamentos
    - Limite `.max(100)` em arrays de itens (workspace create/update, orçamento create/update)

### Lote 9 (commit atual)
- WORKSPACE:
    - Preview 3D de arquivos STL: componente `StlPreview.tsx` com Three.js (scene, PerspectiveCamera, STLLoader, OrbitControls, auto-fit camera, GridHelper)
    - Lazy-load via `next/dynamic` com `ssr: false` — Three.js (~200KB gzip) só carrega quando o usuário clica "3D" em um arquivo .stl
    - Botão "3D" nos arquivos .stl do modal de detalhe, abrindo lightbox fullscreen com rotação e zoom
    - Componente `StlPreviewDynamic.tsx` como wrapper dinâmico com loading state
- SIDEBAR:
    - Mudanças do Lote 7 efetivamente commitadas (LayoutShell.tsx havia ficado de fora no commit anterior)
    - Marketing Kanban e Agenda Marketing commitados
- MARKETING:
    - Fix timezone `dataPublicacao`: API usa `T12:00:00` ao salvar date-only; frontend usa `.slice(0, 10)` em vez de `new Date().toISOString()`
    - Agenda Marketing: parse de dia/mês/ano via string split (sem `new Date()`)
- FIXES:
    - `SeletorPeriodo`: URL corrigida de `/dashboard` para `/home` (migração de URLs do Lote 5)
    - Orçamentos DELETE: `try/catch` adicionado para tratar erros de rede

### Lote 10 (commit atual)
- WORKSPACE:
    - Botões Preview, 3D e Baixar com loading states: feedback visual (texto "Abrindo...", "Carregando...", "Baixando..."), cursor `wait`, botões desabilitados durante operação, transição CSS suave
    - Download refatorado para fetch + blob (antes usava link direto que não mostrava loading)
    - Sincronização de imagens: ao salvar itens no Workspace, imagens do Pedido (ArquivoPedido tipo `image/*`) são copiadas automaticamente para os itens do Orçamento (ImagemItemOrcamento) via round-robin
    - Sincronização de status do Orçamento: SOLICITACAO→RASCUNHO, CUSTO_VIABILIDADE/APROVACAO→ENVIADO (Andamento), PRODUCAO/FRETE/ENVIADO/FINALIZADO→APROVADO, CANCELADO→REPROVADO
    - Fix upload STL: detecção de MIME type por extensão (`.stl`→`model/stl`, `.obj`→`model/obj`, etc.) — resolve browsers que retornam tipo vazio ou `application/vnd.ms-pki.stl` para arquivos 3D. Tratamento de erro melhorado com mensagens específicas.
    - Limite base64 do upload aumentado de 14.1M para 14.5M chars (margem extra para data URL prefix)
- ORÇAMENTOS:
    - Número auto-incremental: ao criar orçamento (via Workspace ou direto), busca `MAX(numero) + 1` dentro de `$transaction`. Campo permanece editável no editor avançado.

### Lote 11 (commit atual)
- RELATÓRIOS:
    - Removida seção "Estoque de Filamentos" (API e frontend)
    - Valor nos Pedidos: `valorTotal` agora é computado a partir dos itens do Workspace (qty × valorUnitario + frete) quando `Pedido.valorTotal` é null
    - KPI "Receita Esperada": soma de todos os pedidos exceto cancelados (cor âmbar)
    - KPI "Receita Real": soma apenas dos pedidos concluídos/entregues (cor verde)
    - KPIs reorganizados em 2 linhas de 3 cards (pedidos + receitas + clientes)
    - Gráfico de barras (Recharts): Receita Real mensal do ano atual, roxo com bordas arredondadas
    - Gráfico de pizza (Recharts): distribuição de pedidos por status, donut com labels percentuais e legenda
    - Gráficos lado a lado em grid 2 colunas
    - Status traduzidos para português na tabela e nos gráficos (Orçamento, Em Produção, Concluído, etc.)
- WORKSPACE:
    - Fix erro 413 upload STL: `proxyClientMaxBodySize: '15mb'` em `next.config.ts` (experimental). Mensagem de erro amigável no frontend para status 413.

### Lote 12 (commit atual)
- WORKSPACE:
    - Fix definitivo upload STL/arquivos grandes: upload convertido de JSON+base64 para `FormData` (binário). Arquivo de 7MB agora trafega como 7MB (antes virava ~9.5MB em base64 JSON, causando 413). Servidor recebe `File` via `formData()`, converte para base64 internamente e salva no banco. Fallback JSON mantido para compatibilidade.
    - Campos de dimensões do pacote na etapa "Cálculo de Frete": Altura (cm), Largura (cm), Comprimento (cm) e Peso (kg) — opcionais, servem de referência para cotação de frete
    - Dimensões exibidas como resumo na etapa "Enviado" (A × L × C cm — P kg)
- SCHEMA:
    - Novos campos no model Workspace: `pacoteAltura`, `pacoteLargura`, `pacoteComprimento` (Decimal 8,2) e `pacotePeso` (Decimal 8,3)

---

### Lote 13 (commit atual)
- WORKSPACE:
    - Limite de upload aumentado para 20MB: frontend (`file.size > 20MB`), API (`MAX_BYTES = 20MB`) e `proxyClientMaxBodySize: '30mb'` em `next.config.ts`
    - Fix "Erro interno" ao salvar pedido: transaction timeout aumentado de 5s para 15s; sync de imagens (ArquivoPedido → ImagemItemOrcamento) agora só roda quando há mudança de etapa (antes rodava em todo save, carregando todo o base64 desnecessariamente); verificação de FK — se Pedido ou Orçamento vinculado foi excluído externamente, desvincula automaticamente em vez de falhar; mensagem de erro detalhada no catch para facilitar debug

---

### Lote 14 (commit atual)
- WORKSPACE:
    - Fix "Unknown argument pacoteAltura": Prisma client estava stale no dev server (rodando versão antiga sem os campos `pacote*`, `infoAdicional`, `observacoes`, `frete`, etc. que o schema já tinha). Reexecutado `prisma db push` (DB já estava em sync) e `prisma generate`. Cache `.next` removido para forçar Next.js a re-importar o cliente atualizado. Necessário reiniciar o dev server (`npm run dev`) para aplicar.
    - Fix "Todos os itens devem ter valor unitário antes de avançar para Aprovação" (causa raiz): a chamada `salvarDetalhes()` antes de `avancarEtapa()` falhava silenciosamente (por causa do bug anterior do Prisma stale), mas o `avancarEtapa()` rodava mesmo assim. Como `avancarEtapa` envia só `{ etapa }` (sem itens), o servidor caía no fallback `wsAtual.itens` (estado antigo do banco, sem valorUnitario) e a validação 422 disparava.
    - Refatorado `salvarDetalhes()` para retornar `Promise<boolean>` indicando sucesso/falha. Botões "Avançar" (CUSTO_VIABILIDADE → APROVACAO e CALCULO_FRETE → ENVIADO) e "Confirmar Finalização" agora abortam se o save falhou. Bloco `try/catch` adicionado em `salvarDetalhes` para capturar erros de rede.

---

### Lote 15 (commit atual)
- WORKSPACE — UPLOAD STL:
    - Diagnóstico: o erro 413 em produção era causado pelo limite hard de 4.5 MB do body de serverless function no Vercel Hobby/Pro. O `proxyClientMaxBodySize: '30mb'` no `next.config.ts` é dev-only e não tem efeito em produção.
    - Solução paliativa (Opção C): limite reduzido para 4 MB no frontend (`uploadArquivo`) e backend (`MAX_BYTES`), com mensagem clara orientando comprimir o STL ou dividir em partes
    - Hint visual "máx. 4 MB" ao lado do botão Upload no modal de detalhe do Workspace
    - Comentário no `MAX_BYTES` documentando a origem do limite
    - Solução definitiva pendente: migrar para Vercel Blob (upload direto browser → blob, sem passar pela função) ou Railway. Vercel Blob tem free tier (~1 GB storage / 10 GB bandwidth) e custo aproximado de $0.023/GB-mês acima do free.

---

### Lote 16 (commit atual)
- VERCEL BLOB — solução definitiva para upload de arquivos grandes:
    - Migrado de upload base64 (limitado a 4 MB pelo body de serverless function) para **upload direto browser → Vercel Blob** via `@vercel/blob/client`
    - Limite elevado para **50 MB por arquivo** (margem confortável dentro do free tier de 1 GB do Hobby)
    - Nova rota `POST /api/blob/token` — gera token de upload assinado (`handleUpload` do `@vercel/blob/client`), sem precisar trafegar o arquivo pela função
    - Schema atualizado: `ArquivoPedido.conteudoBase64` agora é opcional (legado); novos campos `blobUrl`, `blobPathname`. Migration via `prisma db push`
    - GET `/api/pedidos/[id]/arquivos/[arquivoId]` — redireciona 302 para o `blobUrl` se for arquivo novo; mantém compat com base64 dos arquivos legados
    - DELETE — remove do Vercel Blob via `del()` antes de excluir do banco (best-effort, não bloqueia se Blob falhar)
- BLOQUEIO EM 50% DO FREE TIER:
    - `lib/blob-limits.ts` — utilitário com contadores mensais (model `BlobUsage`, id = `YYYY-MM`)
    - Limites de bloqueio: `LIMITE_BYTES = 500 MB` (50% de 1 GB) e `LIMITE_OPS = 5_000` (50% de 10k ops)
    - `verificarLimiteBlob()` chamado dentro do `handleUpload`/`onBeforeGenerateToken`: lança erro com mensagem clara se ultrapassar, **bloqueando o upload antes de consumir cota paga**
    - `registrarUploadMensal()` chamado após registro do arquivo no banco — best-effort, não bloqueia o response
    - Nova rota `GET /api/blob/uso` — retorna uso atual + limites + percentual, para painel admin futuro
- WORKSPACE — RETROCESSO ENTRE ETAPAS:
    - Mapa `ETAPA_ANTERIOR` define o caminho de volta de cada etapa ativa (CUSTO_VIABILIDADE ← APROVACAO ← PRODUCAO ← CALCULO_FRETE ← ENVIADO ← SOLICITACAO)
    - Botão "← Voltar (Custo)" na etapa APROVACAO substitui o antigo "Editar Pedido" que reenviava para SOLICITACAO
    - Botão genérico "← {Etapa Anterior}" disponível em todas as outras etapas ativas via `renderAcoesDetalhe`, com `confirm()` antes de retroceder
    - Reusa o `avancarEtapa(id, etapaAlvo)` existente — qualquer transição entre etapas é permitida pela API
- WORKSPACE — EDIÇÃO DE ITENS EM QUALQUER ETAPA NÃO-TERMINAL:
    - Refatorado `renderItensDetalhe`: variáveis `isCustoViab`/`isReadOnly` substituídas por `isTerminal`/`podeEditar`/`podeEditarValores`
    - `podeEditar` (descrição + quantidade): qualquer etapa exceto FINALIZADO/CANCELADO
    - `podeEditarValores` (R$ unitário e custo): a partir de CUSTO_VIABILIDADE em qualquer etapa não-terminal — antes só era editável em CUSTO_VIABILIDADE
    - Read-only display de valores apenas em FINALIZADO/CANCELADO
- WORKSPACE — EXCLUSÃO E ADIÇÃO DE ITENS:
    - Botão `✕` por item em todas as etapas não-terminais (oculto quando há apenas 1 item, evitando ficar sem itens)
    - Botão "+ Adicionar item" tracejado roxo logo abaixo da lista, chamando `adicionarDetalheItem()` que insere item em branco no estado local
    - Persistência: ambas as operações alteram apenas `detalheItens` (estado local). O save existente em `salvarDetalhes()` faz o `PATCH /api/workspace/[id]` com a lista completa, e o backend já fazia `deleteMany` + `createMany` (idempotente)
- WORKSPACE — UPLOAD POR ITEM:
    - Schema: `ArquivoPedido.itemWorkspaceId String?` (FK opcional) + índice. `null` = arquivo geral do pedido, preenchido = arquivo de um item específico
    - API `POST /api/pedidos/[id]/arquivos`: schema Zod aceita `itemWorkspaceId?: string | null`; persiste no `create`. GET retorna o campo no select
    - Frontend: `ArquivoInfo` ganha `itemWorkspaceId?: string | null`. `uploadArquivo(pedidoId, file, itemWorkspaceId?)` aceita o terceiro parâmetro opcional e prefixa o pathname do blob com `/itens/{id}/` quando aplicável
    - Novo helper `renderArquivosItem(itemId)`: bloco compacto dentro de cada item do detalhe, com botão de upload próprio + lista filtrada por `itemWorkspaceId === itemId`
    - Seção "Arquivos gerais do pedido" agora filtra `arquivos.filter(a => !a.itemWorkspaceId)` — separa visualmente o que é geral do que é por-item

### Lote 16.1 (commit 5facbc2)
- WORKSPACE:
    - Upload bug fix: sanity check `BLOB_READ_WRITE_TOKEN` em `/api/blob/token` (retorna 500 imediato se ausente), AbortController + timeout 60s em `uploadArquivo`, banner `uploadErro` visível dentro do modal (antes ficava atrás do overlay), logs `[upload]` no console
    - Data de entrega editável em todas as etapas (estado `detalheDataEntrega` + input date no header do modal)
    - Card kanban: preview da descrição do 1º item como referência rápida

### Lote 16.2 (commit 74204b6)
- UPLOAD:
    - Migrado de client SDK (`@vercel/blob/client`) para **FormData server-side `put()`** (SDK abortava em dev)
    - `access: 'public'` → `'private'` (Blob Store é private)
    - `onUploadCompleted` removido (exigia callback URL pública, falhava em dev)
    - Limite ajustado: 50 MB → 30 MB (compatível com `proxyClientMaxBodySize`)
- DOWNLOAD/PREVIEW (private store):
    - Rota `/api/pedidos/[id]/arquivos/[arquivoId]` convertida de redirect 302 para **proxy server-side** (fetch com Bearer token)
    - Frontend removido uso direto de `blobUrl` (daria 403 em private store)
- WORKSPACE API:
    - `frete`: `z.number()` → `z.coerce.number()` (consistência com demais decimais)
- CLEANUP:
    - Removidos imports não utilizados (`useRouter`, `upload` from `@vercel/blob/client`, `detectarTipoArquivo`)

### Lote 17 (commit atual)
- WORKSPACE — VISUAL POLISH + RESPONSIVIDADE MOBILE:
    - Novo arquivo `workspace.css` com animações, breakpoints e estilos responsivos
    - Cards: hover com `translateY(-2px)` + sombra roxa sutil, animação de entrada staggered (`ws-fadeUp`), `active` com `scale(0.99)` para feedback tátil
    - Colunas kanban: borda superior colorida por etapa, animação de entrada sequencial, scroll snap no mobile
    - Modais: full-screen em mobile (`max-width: 768px`), `backdrop-filter: blur(2px)`, animação `ws-scaleIn`
    - Botões: `min-height: 44px` (touch-friendly), `ws-btn:active` com `scale(0.97)`
    - Grids: classes `ws-grid-2` e `ws-grid-4` colapsam para 1-2 colunas em mobile
    - Filtros: scroll horizontal sem quebra em mobile
    - Tabela terminal: scroll horizontal em mobile
    - `prefers-reduced-motion`: desativa todas as animações
    - Header: empilha verticalmente em mobile com botão full-width

### Lote 18 (commit atual)
- RESPONSIVIDADE MOBILE — ESTRUTURA COMPLETA:
    - Novo arquivo `app/responsive.css` com regras mobile (<768px), tablet (768-1024px) e `prefers-reduced-motion`
    - Importado em `app/layout.tsx` — aplica globalmente a todas as páginas
    - **LayoutShell**: topbar oculta nome/cargo do usuário em mobile (mostra só avatar), sidebar colapsável já existente otimizada
    - **Home (Dashboard)**: KPIs empilham em grid 2×3 em mobile, gráficos Recharts em coluna única, workspace flow bar vertical, tabelas com scroll horizontal
    - **Pedidos**: tabela oculta em mobile, substituída por cards compactos (número, cliente, descrição, status badge, valor, prazo) com animação `resp-fadeUp`
    - **Orçamentos**: mesma adaptação tabela → cards mobile (número ORC, cliente, total, status, data)
    - **Clientes**: tabela → cards mobile (nome, empresa, email, telefone, contagem de pedidos)
    - **CRM (Leads)**: kanban grid 4 colunas → 1 coluna em mobile, 2 colunas em tablet
    - **Marketing**: kanban 6 colunas → vertical em mobile, `flex` em vez de `grid` para scroll, colunas colapsam em mobile
    - **Agenda Produção**: timeline grid com scroll horizontal em mobile, legenda com `flex-wrap`
    - **Agenda Marketing**: calendário 7×N com scroll horizontal em mobile, seção "Sem data" separada
    - **Relatórios**: KPIs 3→2 colunas em mobile, gráficos lado a lado → empilhados, tabelas com scroll horizontal, cabeçalho com botões empilhados
    - **Modais gerais**: TODOS os modais do sistema (Clientes, CRM, Marketing criar/detalhe, Equipe convite, Sugestões, Cliente detalhe exclusão) agora são full-screen em mobile (`.modal-overlay` + `.modal-content` classes), botões de ação empilham verticalmente com `min-height: 48px`
    - **Filtros**: scroll horizontal sem quebra em mobile (`.filtros-status`)
    - **Paginação**: botões empilham verticalmente com `min-height: 44px` em mobile
    - **Busca**: formulário empilha verticalmente em mobile (`.form-busca`)
    - **Cabeçalhos de ação**: botões empilham em mobile (`.cabecalho-acoes`, `.cabecalho-pagina`)
    - **Workspace CSS**: removido `scroll-behavior: smooth` e `backdrop-filter: blur(2px)` dos modais (causavam lentidão no scroll)
    - `prefers-reduced-motion`: desativa animações dos cards mobile e modais

---

## Pendências

### Testes em Dispositivos Reais
> **Prioridade: Média** · Validação final

1. Testar em Android (Chrome) e iOS (Safari) para garantir que inputs date/time, selects e textareas funcionam corretamente
2. Validar scroll e touch nos kanbans mobile
3. Verificar performance dos modais full-screen

### App Mobile (PWA)
> **Prioridade: Média** · Solução mais simples via PWA

O sistema já é PWA (manifest + service worker registrado). Para criar a experiência de "app nativo":

1. **Já implementado**: `app/manifest.ts` com `display: 'standalone'`, `public/sw.js`, `PwaRegistrar.tsx`, ícones SVG
2. **Ação necessária**: orientar os usuários a "Adicionar à Tela Inicial" no Chrome (Android) ou Safari (iOS), que instala o PWA como app com ícone na home
3. **Futuramente**: app nativo React Native em repositório separado (reutiliza API REST) — stand-by até volume justificar

---

## Ideias. Não implementar.
Futuro(Stand-by):
    Página de Formulário de solicitação de pedido pelo Cliente > Dados entram no fluxo de Solicitação para o Seidão aprovar ou recusar. Página pensada para otimização de Rotina, otimizando o registro das Solicitações pelo Cliente incluindo as principais informações com exceção de valores.