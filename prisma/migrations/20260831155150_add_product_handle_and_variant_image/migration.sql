-- Add product handle + per-variant image link
-- handle: unique URL-safe slug (Shopify's Handle equivalent), backfilled from name (falling
-- back to itemNo), de-duplicated with a numeric suffix.
-- imageId: nullable FK from SupplierProductVariant into the product's own image pool, so a
-- variant can point at one image the Shopify way (several variants may share one image).

-- === SupplierProduct.handle ===

ALTER TABLE "SupplierProduct" ADD COLUMN "handle" TEXT;

WITH slugged AS (
  SELECT
    id,
    NULLIF(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(NULLIF(TRIM(name), ''), "itemNo")), '[^a-z0-9]+', '-', 'g')),
      ''
    ) AS base_slug
  FROM "SupplierProduct"
),
numbered AS (
  SELECT
    id,
    COALESCE(base_slug, 'product') AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(base_slug, 'product') ORDER BY id) AS rn
  FROM slugged
)
UPDATE "SupplierProduct" sp
SET "handle" = CASE WHEN numbered.rn = 1 THEN numbered.base_slug ELSE numbered.base_slug || '-' || numbered.rn END
FROM numbered
WHERE sp.id = numbered.id;

ALTER TABLE "SupplierProduct" ALTER COLUMN "handle" SET NOT NULL;
CREATE UNIQUE INDEX "SupplierProduct_handle_key" ON "SupplierProduct"("handle");

-- === SupplierProductVariant.imageId ===

ALTER TABLE "SupplierProductVariant" ADD COLUMN "imageId" TEXT;
CREATE INDEX "SupplierProductVariant_imageId_idx" ON "SupplierProductVariant"("imageId");
ALTER TABLE "SupplierProductVariant"
  ADD CONSTRAINT "SupplierProductVariant_imageId_fkey"
  FOREIGN KEY ("imageId") REFERENCES "SupplierProductImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
