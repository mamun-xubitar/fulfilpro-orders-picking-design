-- Product <-> Supplier goes many-to-many, and the hub's status vocabulary gains Unlisted.
-- Squashes what were originally three incremental migrations (add the join table, drop the old
-- single-supplier FK, drop the short-lived "primary supplier" flag) into the single end state.

-- 1. Rename the SupplierProductStatus enum's ARCHIVED value to UNLISTED in place, so existing
--    rows keep their status instead of being reset by a drop/recreate of the enum type.
ALTER TYPE "SupplierProductStatus" RENAME VALUE 'ARCHIVED' TO 'UNLISTED';

-- 2. Every supplier that supplies a product (many-to-many, no default/primary among them).
CREATE TABLE "SupplierProductSupplier" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductSupplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierProductSupplier_supplierProductId_supplierId_key" ON "SupplierProductSupplier"("supplierProductId", "supplierId");

CREATE INDEX "SupplierProductSupplier_supplierId_idx" ON "SupplierProductSupplier"("supplierId");

ALTER TABLE "SupplierProductSupplier" ADD CONSTRAINT "SupplierProductSupplier_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierProductSupplier" ADD CONSTRAINT "SupplierProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Backfill every existing product's supplier into the new join table before the old column
--    is dropped below. Most CSV-imported products never got a link row even though
--    SupplierProduct.supplierId was always set (see inventory-product-import.controller.server.ts),
--    so this repairs every gap, not just the intentional multi-supplier ones.
INSERT INTO "SupplierProductSupplier" ("id", "supplierProductId", "supplierId", "createdAt")
SELECT gen_random_uuid()::text, "id", "supplierId", now() FROM "SupplierProduct"
ON CONFLICT ("supplierProductId", "supplierId") DO NOTHING;

-- 4. Drop the now-redundant single-supplier FK and its unique constraint.
ALTER TABLE "SupplierProduct" DROP CONSTRAINT IF EXISTS "SupplierProduct_supplierId_fkey";
DROP INDEX IF EXISTS "SupplierProduct_supplierId_itemNo_key";
ALTER TABLE "SupplierProduct" DROP COLUMN "supplierId";

-- 5. itemNo becomes globally unique (was unique per supplier).
CREATE UNIQUE INDEX "SupplierProduct_itemNo_key" ON "SupplierProduct"("itemNo");
