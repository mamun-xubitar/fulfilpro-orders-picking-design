-- CreateTable
CREATE TABLE "PurchaseOrderReceipt" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "locationName" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderReceipt_purchaseOrderId_idx" ON "PurchaseOrderReceipt"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt" ADD CONSTRAINT "PurchaseOrderReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
