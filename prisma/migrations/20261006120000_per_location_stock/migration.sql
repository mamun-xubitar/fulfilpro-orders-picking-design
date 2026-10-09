-- Stock on hand is now held per location: each variant/location link carries its own quantity, and
-- a located variant's stockOnHand is kept equal to their sum.

ALTER TABLE "SupplierProductVariantLocation" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StockAdjustment" ADD COLUMN "locationId" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN "locationName" TEXT;
CREATE INDEX "StockAdjustment_locationId_idx" ON "StockAdjustment"("locationId");
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: a located variant's whole stock on hand goes into its first location (A→Z by name),
-- so the per-location quantities sum to the existing total.
UPDATE "SupplierProductVariantLocation" vl
SET "quantity" = v."stockOnHand"
FROM (
  SELECT DISTINCT ON (l."variantId") l."variantId", l."locationId"
  FROM "SupplierProductVariantLocation" l
  JOIN "InventoryLocation" il ON il."id" = l."locationId"
  ORDER BY l."variantId", il."name" ASC
) first_loc
JOIN "SupplierProductVariant" v ON v."id" = first_loc."variantId"
WHERE vl."variantId" = first_loc."variantId" AND vl."locationId" = first_loc."locationId";
