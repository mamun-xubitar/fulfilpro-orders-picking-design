-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currentSubtotalPrice" DECIMAL(14,2),
ADD COLUMN     "currentTotalDiscounts" DECIMAL(14,2),
ADD COLUMN     "currentTotalPrice" DECIMAL(14,2),
ADD COLUMN     "currentTotalTax" DECIMAL(14,2),
ADD COLUMN     "taxesIncluded" BOOLEAN;

-- CreateTable
CREATE TABLE "StoreInvoiceSetting" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT,
    "businessName" TEXT,
    "email" TEXT,
    "websiteUrl" TEXT,
    "abn" TEXT,
    "invoicePrefix" TEXT,
    "paymentInstructions" TEXT,
    "accentColor" TEXT,
    "logoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreInvoiceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreInvoiceSetting_storeId_key" ON "StoreInvoiceSetting"("storeId");

-- AddForeignKey
ALTER TABLE "StoreInvoiceSetting" ADD CONSTRAINT "StoreInvoiceSetting_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
