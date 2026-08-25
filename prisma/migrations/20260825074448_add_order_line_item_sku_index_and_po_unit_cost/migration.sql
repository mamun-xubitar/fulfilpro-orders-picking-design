-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "unitCost" DECIMAL(14,2);

-- CreateIndex
CREATE INDEX "OrderLineItem_sku_idx" ON "OrderLineItem"("sku");
