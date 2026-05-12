-- CreateTable
CREATE TABLE "OrderPackingConfirmation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "notifyRecipients" JSONB,
    "notifyMessage" TEXT,
    "pickerId" TEXT,
    "pickerName" TEXT,
    "pickerEmail" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "canceledById" TEXT,
    "canceledByName" TEXT,
    "canceledByEmail" TEXT,
    "cancelNotifyRecipients" JSONB,
    "cancelNotifyMessage" TEXT,

    CONSTRAINT "OrderPackingConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPickingSlipPrint" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "pickerId" TEXT,
    "pickerName" TEXT,
    "pickerEmail" TEXT,
    "printedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPickingSlipPrint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemPickingMetadata" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "sku" TEXT,
    "location" TEXT,
    "remark" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItemPickingMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderPackingConfirmation_orderId_idx" ON "OrderPackingConfirmation"("orderId");

-- CreateIndex
CREATE INDEX "OrderPackingConfirmation_confirmedAt_idx" ON "OrderPackingConfirmation"("confirmedAt");

-- CreateIndex
CREATE INDEX "OrderPackingConfirmation_canceledAt_idx" ON "OrderPackingConfirmation"("canceledAt");

-- CreateIndex
CREATE INDEX "OrderPickingSlipPrint_orderId_idx" ON "OrderPickingSlipPrint"("orderId");

-- CreateIndex
CREATE INDEX "OrderPickingSlipPrint_printedAt_idx" ON "OrderPickingSlipPrint"("printedAt");

-- CreateIndex
CREATE INDEX "OrderItemPickingMetadata_storeId_idx" ON "OrderItemPickingMetadata"("storeId");

-- CreateIndex
CREATE INDEX "OrderItemPickingMetadata_productId_idx" ON "OrderItemPickingMetadata"("productId");

-- CreateIndex
CREATE INDEX "OrderItemPickingMetadata_variantId_idx" ON "OrderItemPickingMetadata"("variantId");

-- CreateIndex
CREATE INDEX "OrderItemPickingMetadata_sku_idx" ON "OrderItemPickingMetadata"("sku");

-- AddForeignKey
ALTER TABLE "OrderPackingConfirmation" ADD CONSTRAINT "OrderPackingConfirmation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPickingSlipPrint" ADD CONSTRAINT "OrderPickingSlipPrint_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
