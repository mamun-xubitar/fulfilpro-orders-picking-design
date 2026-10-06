-- Group stock adjustment lines under one "main" adjustment (StockAdjustmentBatch, shown as ADJ-0001).

CREATE TYPE "StockAdjustmentSource" AS ENUM ('MANUAL', 'STOCKTAKE');

CREATE TABLE "StockAdjustmentBatch" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "source" "StockAdjustmentSource" NOT NULL DEFAULT 'MANUAL',
    "reference" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustmentBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockAdjustmentBatch_number_key" ON "StockAdjustmentBatch"("number");
CREATE INDEX "StockAdjustmentBatch_supplierProductId_createdAt_idx" ON "StockAdjustmentBatch"("supplierProductId", "createdAt");
CREATE INDEX "StockAdjustmentBatch_createdAt_idx" ON "StockAdjustmentBatch"("createdAt");

ALTER TABLE "StockAdjustmentBatch" ADD CONSTRAINT "StockAdjustmentBatch_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockAdjustment" ADD COLUMN "batchId" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN "stockBefore" INTEGER;
ALTER TABLE "InventoryActivity" ADD COLUMN "adjustmentBatchId" TEXT;

-- Backfill: nothing links the rows of an earlier multi-row save, so each existing line becomes a
-- one-line adjustment of its own (the batch reuses the line's id), numbered in the order they were made.
INSERT INTO "StockAdjustmentBatch" ("id", "supplierProductId", "source", "actorId", "actorName", "createdAt")
SELECT "id", "supplierProductId", 'MANUAL', "actorId", "actorName", "createdAt"
FROM "StockAdjustment"
ORDER BY "createdAt", "id";

UPDATE "StockAdjustment" SET "batchId" = "id";

ALTER TABLE "StockAdjustment" ALTER COLUMN "batchId" SET NOT NULL;
CREATE INDEX "StockAdjustment_batchId_idx" ON "StockAdjustment"("batchId");
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockAdjustmentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
