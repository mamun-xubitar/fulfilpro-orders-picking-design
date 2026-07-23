DROP INDEX IF EXISTS "ProductSyncJob_one_active_idx";

CREATE UNIQUE INDEX "ProductSyncJob_one_active_idx" ON "ProductSyncJob"((1)) WHERE "status" IN ('queued', 'running');
