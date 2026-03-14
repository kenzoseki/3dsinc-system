-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('ORCAMENTO', 'APROVADO', 'EM_PRODUCAO', 'PAUSADO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PLA_PLUS', 'RESIN_STANDARD', 'RESIN_ABS_LIKE', 'NYLON', 'OUTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL DEFAULT 'OPERADOR',
    "avatarUrl" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL DEFAULT 'OPERADOR',
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "enviadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Convite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "empresa" TEXT,
    "cpfCnpj" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "arquivo3d" TEXT,
    "status" "StatusPedido" NOT NULL DEFAULT 'ORCAMENTO',
    "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
    "valorTotal" DECIMAL(10,2),
    "prazoEntrega" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "filamentoId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "pesoGramas" DECIMAL(8,2),
    "tempoHoras" DECIMAL(6,2),
    "valorUnitario" DECIMAL(10,2),

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "status" "StatusPedido" NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filamento" (
    "id" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "material" "MaterialType" NOT NULL,
    "cor" TEXT NOT NULL,
    "corHex" TEXT,
    "diametro" DECIMAL(4,2) NOT NULL,
    "pesoTotal" DECIMAL(8,2) NOT NULL,
    "pesoAtual" DECIMAL(8,2) NOT NULL,
    "temperatura" INTEGER,
    "velocidade" INTEGER,
    "localizacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaEstoque" (
    "id" TEXT NOT NULL,
    "filamentoId" TEXT NOT NULL,
    "tipoAlerta" TEXT NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertaEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Convite_token_key" ON "Convite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpfCnpj_key" ON "Cliente"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- AddForeignKey
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_enviadoPor_fkey" FOREIGN KEY ("enviadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_filamentoId_fkey" FOREIGN KEY ("filamentoId") REFERENCES "Filamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPedido" ADD CONSTRAINT "HistoricoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPedido" ADD CONSTRAINT "HistoricoPedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaEstoque" ADD CONSTRAINT "AlertaEstoque_filamentoId_fkey" FOREIGN KEY ("filamentoId") REFERENCES "Filamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
