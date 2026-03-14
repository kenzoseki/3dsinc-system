-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('B2C', 'B2B');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "tipo" "TipoPedido" NOT NULL DEFAULT 'B2C';
