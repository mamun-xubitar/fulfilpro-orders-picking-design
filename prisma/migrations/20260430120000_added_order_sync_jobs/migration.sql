CREATE TABLE "OrderSyncJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "windowEndedAt" TIMESTAMP(3) NOT NULL,
    "totalStores" INTEGER NOT NULL DEFAULT 0,
    "totalFetched" INTEGER NOT NULL DEFAULT 0,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "totalUpdated" INTEGER NOT NULL DEFAULT 0,
    "failedStores" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderSyncJob_status_idx" ON "OrderSyncJob"("status");
CREATE INDEX "OrderSyncJob_createdAt_idx" ON "OrderSyncJob"("createdAt");
CREATE INDEX "OrderSyncJob_finishedAt_idx" ON "OrderSyncJob"("finishedAt");
CREATE UNIQUE INDEX "OrderSyncJob_one_active_idx" ON "OrderSyncJob"("status") WHERE "status" IN ('queued', 'running');
