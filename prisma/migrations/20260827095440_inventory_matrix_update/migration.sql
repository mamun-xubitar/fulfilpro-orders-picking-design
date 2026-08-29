-- Variants / stock matrix rework: Allocated becomes a stored, manually-editable
-- column instead of a purely derived one; Trigger now defaults to 10.
ALTER TABLE "SupplierProductVariant" ADD COLUMN "allocated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SupplierProductVariant" ALTER COLUMN "trigger" SET DEFAULT 10;

-- Pricing panel: currency defaults to USD, and "tax" now means a percent of the
-- ex-tax sell price rather than a flat base-currency amount. Existing flat
-- amounts are meaningless as percents, so every row resets to the 10% default.
ALTER TABLE "SupplierProductPricing" ALTER COLUMN "currencyCode" SET DEFAULT 'USD';
ALTER TABLE "SupplierProductPricing" ALTER COLUMN "tax" SET DEFAULT 10;
UPDATE "SupplierProductPricing" SET "tax" = 10;
