DROP INDEX IF EXISTS "OrderSyncJob_one_active_idx";

CREATE UNIQUE INDEX "OrderSyncJob_one_active_idx" ON "OrderSyncJob"((1)) WHERE "status" IN ('queued', 'running');
