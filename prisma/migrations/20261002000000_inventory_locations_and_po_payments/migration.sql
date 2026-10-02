-- CreateEnum
CREATE TYPE "PoPaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "PurchaseOrderPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "status" "PoPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "currencyCode" TEXT NOT NULL,
    "exchangeRate" DECIMAL(14,6) NOT NULL,
    "buyingPrice" DECIMAL(14,2) NOT NULL,
    "freight" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "misc" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAud" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "remark" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderPaymentHistory" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "PoPaymentStatus" NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "exchangeRate" DECIMAL(14,6) NOT NULL,
    "buyingPrice" DECIMAL(14,2) NOT NULL,
    "freight" DECIMAL(14,2) NOT NULL,
    "misc" DECIMAL(14,2) NOT NULL,
    "totalAud" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "remark" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderPaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductVariantLocation" (
    "variantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductVariantLocation_pkey" PRIMARY KEY ("variantId","locationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderPayment_purchaseOrderId_key" ON "PurchaseOrderPayment"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderPayment_status_idx" ON "PurchaseOrderPayment"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderPaymentHistory_paymentId_createdAt_idx" ON "PurchaseOrderPaymentHistory"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderPaymentHistory_createdAt_idx" ON "PurchaseOrderPaymentHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLocation_name_key" ON "InventoryLocation"("name");

-- CreateIndex
CREATE INDEX "SupplierProductVariantLocation_locationId_idx" ON "SupplierProductVariantLocation"("locationId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderPayment" ADD CONSTRAINT "PurchaseOrderPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderPaymentHistory" ADD CONSTRAINT "PurchaseOrderPaymentHistory_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PurchaseOrderPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductVariantLocation" ADD CONSTRAINT "SupplierProductVariantLocation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductVariantLocation" ADD CONSTRAINT "SupplierProductVariantLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

