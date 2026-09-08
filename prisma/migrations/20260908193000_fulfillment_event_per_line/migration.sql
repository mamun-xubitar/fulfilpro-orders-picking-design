-- Per-line fulfilment idempotency.
--
-- The previous unique key on (storeId, fulfillmentId) made the second and later
-- lines of a multi-line fulfilment collide: their stock moves rolled back and were
-- silently skipped, permanently. The key becomes (storeId, fulfillmentId, lineItemId).
--
-- Existing rows were written under the old per-fulfilment key, so they are dropped
-- first. Safe: re-applying those fulfilments is a no-op via the outstanding cap
-- (fulfilled lines have nothing outstanding left to move).
DELETE FROM "ProcessedFulfillmentEvent";

-- AlterTable
ALTER TABLE "ProcessedFulfillmentEvent" ADD COLUMN "lineItemId" TEXT NOT NULL;

-- DropIndex
DROP INDEX "ProcessedFulfillmentEvent_storeId_fulfillmentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedFulfillmentEvent_storeId_fulfillmentId_lineItemId_key" ON "ProcessedFulfillmentEvent"("storeId", "fulfillmentId", "lineItemId");
