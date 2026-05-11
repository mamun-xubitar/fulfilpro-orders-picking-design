CREATE TABLE "OrderStockAdjustment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "items" JSONB NOT NULL,
    "lastEventType" TEXT NOT NULL,
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "managedById" TEXT,
    "managedByName" TEXT,
    "managedByEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderStockAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderStockAdjustment_orderId_key" ON "OrderStockAdjustment"("orderId");
CREATE INDEX "OrderStockAdjustment_status_idx" ON "OrderStockAdjustment"("status");
CREATE INDEX "OrderStockAdjustment_lastEventAt_idx" ON "OrderStockAdjustment"("lastEventAt");

ALTER TABLE "OrderStockAdjustment" ADD CONSTRAINT "OrderStockAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
