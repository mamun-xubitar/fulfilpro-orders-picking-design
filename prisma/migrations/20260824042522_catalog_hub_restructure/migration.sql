-- Catalog hub restructure
-- SupplierProduct becomes the hub catalogue master (was a bare supplier<->product link table).
-- This migration backfills existing SupplierProduct links and PurchaseOrder rows from their
-- linked Shopify Product / ProductVariant data before dropping the old columns.

-- === Enums ===

CREATE TYPE "SupplierProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');
CREATE TYPE "StocktakeStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
CREATE TYPE "StockAdjustmentReason" AS ENUM ('DAMAGED', 'LOST', 'FOUND', 'RETURN', 'CORRECTION', 'OTHER');

-- === Drop constraints/indexes we're about to restructure (columns stay for now) ===

ALTER TABLE "ProductPricing" DROP CONSTRAINT "ProductPricing_productId_fkey";
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_productId_fkey";
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_variantId_fkey";
ALTER TABLE "SupplierProduct" DROP CONSTRAINT "SupplierProduct_productId_fkey";
DROP INDEX "PurchaseOrder_productId_createdAt_idx";
DROP INDEX "SupplierProduct_productId_linkedAt_idx";
DROP INDEX "SupplierProduct_supplierId_productId_key";

-- === AppSettings ===

ALTER TABLE "AppSettings" ADD COLUMN "globalExchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1;

-- === SupplierProduct: add new catalogue columns (nullable for now, backfilled below) ===

ALTER TABLE "SupplierProduct"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "itemNo" TEXT,
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "deliveryRemarks" TEXT,
  ADD COLUMN "status" "SupplierProductStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "colours" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "nextStocktakeAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill createdAt from the original link timestamp.
UPDATE "SupplierProduct" SET "createdAt" = "linkedAt";

-- Ensure every (supplierId, productId) pair referenced by an existing PurchaseOrder has a
-- SupplierProduct row to attach to, even if that product was never linked via the old
-- supplier<->product link table.
INSERT INTO "SupplierProduct" ("id", "supplierId", "productId", "createdAt")
SELECT gen_random_uuid(), po."supplierId", po."productId", now()
FROM (SELECT DISTINCT "supplierId", "productId" FROM "PurchaseOrder") po
WHERE NOT EXISTS (
  SELECT 1 FROM "SupplierProduct" sp WHERE sp."supplierId" = po."supplierId" AND sp."productId" = po."productId"
);

-- Backfill catalogue fields from the linked Shopify product.
UPDATE "SupplierProduct" sp
SET
  "name" = p.title,
  "itemNo" = COALESCE(NULLIF(p.handle, ''), sp.id),
  "sku" = COALESCE(NULLIF(p.handle, ''), sp.id),
  "brand" = p.vendor,
  "category" = p.category,
  "categoryId" = p."categoryId",
  "description" = regexp_replace(COALESCE(p."descriptionHtml", ''), '<[^>]*>', ' ', 'g')
FROM "Product" p
WHERE p.id = sp."productId";

UPDATE "SupplierProduct" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "SupplierProduct"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "itemNo" SET NOT NULL,
  ALTER COLUMN "sku" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- === SupplierProductVariant: create, then backfill from ProductVariant ===

CREATE TABLE "SupplierProductVariant" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "colour" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "buyPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sellPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "trigger" INTEGER NOT NULL DEFAULT 0,
    "forwardOrders" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductVariant_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SupplierProductVariant" ("id", "supplierProductId", "sku", "barcode", "colour", "size", "stockOnHand", "buyPrice", "sellPrice", "trigger", "position")
SELECT
  gen_random_uuid(),
  sp.id,
  pv.sku,
  NULL,
  COALESCE(
    (SELECT elem->>'value' FROM jsonb_array_elements(COALESCE(pv."optionValues", '[]'::jsonb)) elem WHERE lower(elem->>'name') IN ('color', 'colour') LIMIT 1),
    pv."optionValues"->0->>'value',
    'Default'
  ),
  COALESCE(
    (SELECT elem->>'value' FROM jsonb_array_elements(COALESCE(pv."optionValues", '[]'::jsonb)) elem WHERE lower(elem->>'name') = 'size' LIMIT 1),
    pv."optionValues"->1->>'value',
    ''
  ),
  pv."inventoryQuantity",
  COALESCE(pv.cost, 0),
  pv.price,
  COALESCE((SELECT "lowStockThreshold" FROM "AppSettings" WHERE id = 'default'), 10),
  pv.position
FROM "SupplierProduct" sp
JOIN "ProductVariant" pv ON pv."productId" = sp."productId"
ON CONFLICT DO NOTHING;

CREATE INDEX "SupplierProductVariant_supplierProductId_idx" ON "SupplierProductVariant"("supplierProductId");
CREATE INDEX "SupplierProductVariant_sku_idx" ON "SupplierProductVariant"("sku");
CREATE INDEX "SupplierProductVariant_barcode_idx" ON "SupplierProductVariant"("barcode");
CREATE UNIQUE INDEX "SupplierProductVariant_supplierProductId_colour_size_key" ON "SupplierProductVariant"("supplierProductId", "colour", "size");

-- === SupplierProductImage: create, backfill one row per product's hero image ===

CREATE TABLE "SupplierProductImage" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "colour" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductImage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SupplierProductImage" ("id", "supplierProductId", "url", "altText", "colour", "position")
SELECT gen_random_uuid(), sp.id, p."imageUrl", sp.name, NULL, 0
FROM "SupplierProduct" sp
JOIN "Product" p ON p.id = sp."productId"
WHERE p."imageUrl" IS NOT NULL;

CREATE INDEX "SupplierProductImage_supplierProductId_idx" ON "SupplierProductImage"("supplierProductId");

-- === SupplierProductPricing: create (no rows to backfill — ProductPricing was empty) ===

CREATE TABLE "SupplierProductPricing" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'AUD',
    "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
    "buyingPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "freight" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "misc" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierProductPricing_supplierProductId_key" ON "SupplierProductPricing"("supplierProductId");

-- === Stocktake / StocktakeItem / StockAdjustment / InventoryActivity: new, empty ===

CREATE TABLE "Stocktake" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "status" "StocktakeStatus" NOT NULL DEFAULT 'OPEN',
    "startedById" TEXT NOT NULL,
    "startedByName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stocktake_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Stocktake_supplierProductId_createdAt_idx" ON "Stocktake"("supplierProductId", "createdAt");

CREATE TABLE "StocktakeItem" (
    "id" TEXT NOT NULL,
    "stocktakeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "countedQty" INTEGER,

    CONSTRAINT "StocktakeItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StocktakeItem_stocktakeId_idx" ON "StocktakeItem"("stocktakeId");
CREATE INDEX "StocktakeItem_variantId_idx" ON "StocktakeItem"("variantId");

CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "note" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockAdjustment_supplierProductId_createdAt_idx" ON "StockAdjustment"("supplierProductId", "createdAt");
CREATE INDEX "StockAdjustment_variantId_idx" ON "StockAdjustment"("variantId");

CREATE TABLE "InventoryActivity" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryActivity_supplierProductId_createdAt_idx" ON "InventoryActivity"("supplierProductId", "createdAt");

-- === PurchaseOrder: repoint productId -> supplierProductId ===

ALTER TABLE "PurchaseOrder" ADD COLUMN "supplierProductId" TEXT;

UPDATE "PurchaseOrder" po
SET "supplierProductId" = sp.id
FROM "SupplierProduct" sp
WHERE sp."supplierId" = po."supplierId" AND sp."productId" = po."productId";

ALTER TABLE "PurchaseOrder" ALTER COLUMN "supplierProductId" SET NOT NULL;

CREATE INDEX "PurchaseOrder_supplierProductId_createdAt_idx" ON "PurchaseOrder"("supplierProductId", "createdAt");
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- === PurchaseOrderItem: remap variantId from the old ProductVariant to the new SupplierProductVariant ===

UPDATE "PurchaseOrderItem" poi
SET "variantId" = (
  SELECT spv.id
  FROM "PurchaseOrder" po
  JOIN "ProductVariant" pv ON pv.id = poi."variantId"
  JOIN "SupplierProductVariant" spv ON spv."supplierProductId" = po."supplierProductId"
    AND spv."colour" = COALESCE(
      (SELECT elem->>'value' FROM jsonb_array_elements(COALESCE(pv."optionValues", '[]'::jsonb)) elem WHERE lower(elem->>'name') IN ('color', 'colour') LIMIT 1),
      pv."optionValues"->0->>'value',
      'Default'
    )
    AND spv."size" = COALESCE(
      (SELECT elem->>'value' FROM jsonb_array_elements(COALESCE(pv."optionValues", '[]'::jsonb)) elem WHERE lower(elem->>'name') = 'size' LIMIT 1),
      pv."optionValues"->1->>'value',
      ''
    )
  WHERE po.id = poi."purchaseOrderId"
  LIMIT 1
)
WHERE poi."variantId" IS NOT NULL;

-- Any item whose old variant no longer matches a backfilled row falls back to NULL, same as the
-- existing "variant was deleted" semantics.
UPDATE "PurchaseOrderItem" SET "variantId" = NULL
WHERE "variantId" IS NOT NULL AND "variantId" NOT IN (SELECT id FROM "SupplierProductVariant");

ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- === Drop the old link-table columns now that everything is backfilled ===

ALTER TABLE "PurchaseOrder" DROP COLUMN "productId";
ALTER TABLE "SupplierProduct" DROP COLUMN "productId";
ALTER TABLE "SupplierProduct" DROP COLUMN "linkedAt";

CREATE INDEX "SupplierProduct_createdAt_idx" ON "SupplierProduct"("createdAt");
CREATE INDEX "SupplierProduct_name_idx" ON "SupplierProduct"("name");
CREATE INDEX "SupplierProduct_sku_idx" ON "SupplierProduct"("sku");
CREATE UNIQUE INDEX "SupplierProduct_supplierId_itemNo_key" ON "SupplierProduct"("supplierId", "itemNo");

ALTER TABLE "SupplierProductVariant" ADD CONSTRAINT "SupplierProductVariant_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierProductImage" ADD CONSTRAINT "SupplierProductImage_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierProductPricing" ADD CONSTRAINT "SupplierProductPricing_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryActivity" ADD CONSTRAINT "InventoryActivity_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- === Drop ProductPricing (superseded by SupplierProductPricing, was already empty) ===

DROP TABLE "ProductPricing";
