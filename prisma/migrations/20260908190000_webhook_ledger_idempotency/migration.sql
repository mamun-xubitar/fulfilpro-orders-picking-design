-- Webhook ledger idempotency + Shopify-correct refund semantics.
--
-- Context: a previous out-of-band migration (20260908180000, history row since
-- removed) had already applied the refundedQuantity column, narrowed the tax
-- percent column, dropped updatedAt DB defaults and created an experimental
-- InventoryFulfillmentProgress table. This migration records that converged
-- state in history and adds per-fulfilment / per-refund idempotency tables.
-- IF EXISTS / IF NOT EXISTS guards keep fresh-database replays safe.

-- DropTable: removes the empty, unused experimental table (0 rows, zero code references).
DROP TABLE IF EXISTS "InventoryFulfillmentProgress";

-- AlterTable: tracks refunded units so a duplicate RETURN refund can't restock twice.
-- Already present on live DB; IF NOT EXISTS keeps this replay-safe.
ALTER TABLE "InventoryAllocation" ADD COLUMN IF NOT EXISTS "refundedQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: tax is a percent (0-100), narrowed from DECIMAL(14,2) to DECIMAL(6,2).
ALTER TABLE "SupplierProductPricing" ALTER COLUMN "tax" TYPE DECIMAL(6,2);

-- AlterTable: Prisma 7 manages updatedAt client-side; drop leftover DB defaults.
ALTER TABLE "Stocktake" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "SupplierProductPricing" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "SupplierProductVariant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable: per-fulfilment idempotency for fulfillments/create + fulfillments/update.
-- Shopify re-delivers the same fulfilment id on every status change with a fresh
-- webhook id, so delivery-level dedup alone cannot prevent double stock moves.
CREATE TABLE IF NOT EXISTS "ProcessedFulfillmentEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "appliedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedFulfillmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: per-refund-line idempotency for refunds/create.
CREATE TABLE IF NOT EXISTS "ProcessedRefundEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "restockType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedRefundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedFulfillmentEvent_storeId_fulfillmentId_key" ON "ProcessedFulfillmentEvent"("storeId", "fulfillmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProcessedFulfillmentEvent_storeId_shopifyOrderId_idx" ON "ProcessedFulfillmentEvent"("storeId", "shopifyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedRefundEvent_storeId_refundId_lineItemId_key" ON "ProcessedRefundEvent"("storeId", "refundId", "lineItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProcessedRefundEvent_storeId_shopifyOrderId_idx" ON "ProcessedRefundEvent"("storeId", "shopifyOrderId");

-- AddForeignKey
ALTER TABLE "ProcessedFulfillmentEvent" ADD CONSTRAINT "ProcessedFulfillmentEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedRefundEvent" ADD CONSTRAINT "ProcessedRefundEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
