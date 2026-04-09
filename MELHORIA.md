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

---

## Melhorias e correções para implementar. (Sempre utilizar skill de Front-end)

## Ideias. Não implementar.
Futuro(Stand-by):
    Página de Formulário de solicitação de pedido pelo Cliente > Dados entram no fluxo de Solicitação para o Seidão aprovar ou recusar. Página pensada para otimização de Rotina, otimizando o registro das Solicitações pelo Cliente incluindo as principais informações com exceção de valores.