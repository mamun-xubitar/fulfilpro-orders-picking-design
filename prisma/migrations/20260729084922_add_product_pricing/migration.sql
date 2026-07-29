-- CreateTable
CREATE TABLE "ProductPricing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'AUD',
    "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
    "buyingPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "freight" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "misc" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPricing_productId_key" ON "ProductPricing"("productId");

-- AddForeignKey
ALTER TABLE "ProductPricing" ADD CONSTRAINT "ProductPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
