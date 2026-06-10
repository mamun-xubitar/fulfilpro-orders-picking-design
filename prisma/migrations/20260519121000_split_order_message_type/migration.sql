-- CreateEnum
CREATE TYPE "OrderMessageType" AS ENUM ('orders', 'picker');

-- AlterTable
ALTER TABLE "OrderMessage"
ADD COLUMN "type" "OrderMessageType" NOT NULL DEFAULT 'orders';

-- DropIndex
DROP INDEX "OrderMessage_orderId_createdAt_idx";

-- CreateIndex
CREATE INDEX "OrderMessage_orderId_type_createdAt_idx" ON "OrderMessage"("orderId", "type", "createdAt");
