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

### Lote 3 (commit atual)
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

---

## Melhorias e correções para implementar

_(Preencher novos itens aqui)_
