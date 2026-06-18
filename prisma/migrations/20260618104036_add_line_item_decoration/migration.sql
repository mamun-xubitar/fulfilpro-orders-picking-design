-- CreateTable
CREATE TABLE "LineItemDecoration" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "isEmbroidery" BOOLEAN NOT NULL DEFAULT false,
    "isPrint" BOOLEAN NOT NULL DEFAULT false,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineItemDecoration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineItemDecoration_orderId_idx" ON "LineItemDecoration"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LineItemDecoration_orderId_lineItemId_key" ON "LineItemDecoration"("orderId", "lineItemId");

-- AddForeignKey
ALTER TABLE "LineItemDecoration" ADD CONSTRAINT "LineItemDecoration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
