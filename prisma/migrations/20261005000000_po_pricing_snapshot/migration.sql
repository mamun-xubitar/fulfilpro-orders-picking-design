-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "pricingCurrencyCode" TEXT,
ADD COLUMN "pricingExchangeRate" DECIMAL(14,6),
ADD COLUMN "pricingBuyingPrice" DECIMAL(14,2),
ADD COLUMN "pricingFreight" DECIMAL(14,2),
ADD COLUMN "pricingMisc" DECIMAL(14,2);

-- Backfill: freeze each existing PO at its product's current pricing so it stops drifting from here on.
-- The figures at the time each PO was created are not recoverable.
UPDATE "PurchaseOrder" po
SET "pricingCurrencyCode" = sp."currencyCode",
    "pricingExchangeRate" = sp."exchangeRate",
    "pricingBuyingPrice" = sp."buyingPrice",
    "pricingFreight" = sp."freight",
    "pricingMisc" = sp."misc"
FROM "SupplierProductPricing" sp
WHERE sp."supplierProductId" = po."supplierProductId";
