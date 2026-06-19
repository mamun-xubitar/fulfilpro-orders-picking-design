-- CreateTable
CREATE TABLE "LineItemWork" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "workerEmail" TEXT NOT NULL,
    "workerRole" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantityDone" INTEGER NOT NULL,
    "comments" JSONB NOT NULL DEFAULT '[]',
    "digestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineItemWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecorationEditRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
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

    CONSTRAINT "DecorationEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineItemWork_orderId_idx" ON "LineItemWork"("orderId");

-- CreateIndex
CREATE INDEX "LineItemWork_workerId_idx" ON "LineItemWork"("workerId");

-- CreateIndex
CREATE INDEX "LineItemWork_digestSentAt_idx" ON "LineItemWork"("digestSentAt");

-- CreateIndex
CREATE UNIQUE INDEX "DecorationEditRequest_approveToken_key" ON "DecorationEditRequest"("approveToken");

-- CreateIndex
CREATE UNIQUE INDEX "DecorationEditRequest_rejectToken_key" ON "DecorationEditRequest"("rejectToken");

-- CreateIndex
CREATE INDEX "DecorationEditRequest_orderId_idx" ON "DecorationEditRequest"("orderId");

-- CreateIndex
CREATE INDEX "DecorationEditRequest_lineItemId_idx" ON "DecorationEditRequest"("lineItemId");

-- CreateIndex
CREATE INDEX "DecorationEditRequest_status_idx" ON "DecorationEditRequest"("status");

-- CreateIndex
CREATE INDEX "DecorationEditRequest_approveToken_idx" ON "DecorationEditRequest"("approveToken");

-- CreateIndex
CREATE INDEX "DecorationEditRequest_rejectToken_idx" ON "DecorationEditRequest"("rejectToken");

-- AddForeignKey
ALTER TABLE "LineItemWork" ADD CONSTRAINT "LineItemWork_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecorationEditRequest" ADD CONSTRAINT "DecorationEditRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
