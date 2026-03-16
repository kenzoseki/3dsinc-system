-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "ConfiguracaoEmpresa" (
    "id" TEXT NOT NULL DEFAULT 'empresa',
    "nomeEmpresa" TEXT NOT NULL DEFAULT '3D Sinc',
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "logoBase64" TEXT,
    "alertaEstoqueBaixo" BOOLEAN NOT NULL DEFAULT true,
    "alertaPedidoAtrasado" BOOLEAN NOT NULL DEFAULT true,
    "alertaEmailHabilitado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "revisao" INTEGER NOT NULL DEFAULT 0,
    "clienteNome" TEXT NOT NULL,
    "clienteEmpresa" TEXT,
    "clienteCnpj" TEXT,
    "clienteEmail" TEXT,
    "clienteTelefone" TEXT,
    "clienteEndereco" TEXT,
    "clienteCep" TEXT,
    "clienteResponsavel" TEXT,
    "clienteCodInterno" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validadeDias" INTEGER NOT NULL DEFAULT 5,
    "orcamentista" TEXT,
    "cidade" TEXT,
    "condicoesTecnicas" TEXT,
    "condicoesComerciais" TEXT,
    "notas" TEXT,
    "frete" DECIMAL(10,2),
    "aliquotaImposto" DECIMAL(5,2),
    "bonusPercentual" DECIMAL(5,2),
    "status" "StatusOrcamento" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamento" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "detalhamento" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ItemOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_numero_key" ON "Orcamento"("numero");

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
