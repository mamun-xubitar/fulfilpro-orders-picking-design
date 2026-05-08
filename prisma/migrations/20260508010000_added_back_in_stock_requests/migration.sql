-- CreateTable
CREATE TABLE "BackInStockRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "items" JSONB NOT NULL,
    "requestMessage" TEXT,
    "requesterViewedAt" TIMESTAMP(3),
    "lastAdminUpdateAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackInStockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackInStockMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackInStockMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackInStockRequest_orderId_idx" ON "BackInStockRequest"("orderId");

-- CreateIndex
CREATE INDEX "BackInStockRequest_requesterId_idx" ON "BackInStockRequest"("requesterId");

-- CreateIndex
CREATE INDEX "BackInStockRequest_status_idx" ON "BackInStockRequest"("status");

-- CreateIndex
CREATE INDEX "BackInStockRequest_updatedAt_idx" ON "BackInStockRequest"("updatedAt");

-- CreateIndex
CREATE INDEX "BackInStockMessage_requestId_createdAt_idx" ON "BackInStockMessage"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "BackInStockRequest" ADD CONSTRAINT "BackInStockRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockMessage" ADD CONSTRAINT "BackInStockMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BackInStockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
