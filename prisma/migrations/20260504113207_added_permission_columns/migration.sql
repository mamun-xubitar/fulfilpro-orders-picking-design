-- CreateTable
CREATE TABLE "FulfillmentEditRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminTargets" JSONB NOT NULL,
    "approveToken" TEXT NOT NULL,
    "rejectToken" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedByName" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentEditRequest_approveToken_key" ON "FulfillmentEditRequest"("approveToken");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentEditRequest_rejectToken_key" ON "FulfillmentEditRequest"("rejectToken");

-- CreateIndex
CREATE INDEX "FulfillmentEditRequest_orderId_idx" ON "FulfillmentEditRequest"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentEditRequest_fulfillmentId_idx" ON "FulfillmentEditRequest"("fulfillmentId");

-- CreateIndex
CREATE INDEX "FulfillmentEditRequest_status_idx" ON "FulfillmentEditRequest"("status");

-- CreateIndex
CREATE INDEX "FulfillmentEditRequest_requestedById_idx" ON "FulfillmentEditRequest"("requestedById");

-- CreateIndex
CREATE INDEX "FulfillmentEditRequest_approveToken_idx" ON "FulfillmentEditRequest"("approveToken");

-- CreateIndex
CREATE INDEX "FulfillmentEditRequest_rejectToken_idx" ON "FulfillmentEditRequest"("rejectToken");
