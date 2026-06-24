-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "seventrackApiKey" TEXT,
ADD COLUMN     "trackingAutoRegisterEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackingPendingAlertDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "trackingPendingAlertUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "trackingPickupReminderDays" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ShipmentTracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "carrier" INTEGER,
    "registrationStatus" TEXT NOT NULL DEFAULT 'registered',
    "status" TEXT,
    "subStatus" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "lastEventDesc" TEXT,
    "lastEventLocation" TEXT,
    "events" JSONB,
    "shippedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "availableForPickupAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "pendingAlertSentAt" TIMESTAMP(3),
    "pickupRemindersSent" JSONB NOT NULL DEFAULT '[]',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "runAfter" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentTracking_trackingNumber_idx" ON "ShipmentTracking"("trackingNumber");

-- CreateIndex
CREATE INDEX "ShipmentTracking_status_idx" ON "ShipmentTracking"("status");

-- CreateIndex
CREATE INDEX "ShipmentTracking_registrationStatus_idx" ON "ShipmentTracking"("registrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentTracking_orderId_trackingNumber_key" ON "ShipmentTracking"("orderId", "trackingNumber");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");

-- CreateIndex
CREATE INDEX "BackgroundJob_runAfter_idx" ON "BackgroundJob"("runAfter");

-- CreateIndex
CREATE INDEX "BackgroundJob_createdAt_idx" ON "BackgroundJob"("createdAt");

-- AddForeignKey
ALTER TABLE "ShipmentTracking" ADD CONSTRAINT "ShipmentTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentTracking" ADD CONSTRAINT "ShipmentTracking_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
