-- Drop the supplier<->Shopify-collection linking feature (removed from the app).
ALTER TABLE "SupplierCollection" DROP CONSTRAINT "SupplierCollection_storeId_fkey";
ALTER TABLE "SupplierCollection" DROP CONSTRAINT "SupplierCollection_supplierId_fkey";
DROP TABLE "SupplierCollection";

-- Seed a starter foreign currency so the pricing panel's currency picker isn't empty.
INSERT INTO "CurrencyRate" ("id", "code", "rate", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'USD', 1.55, now(), now())
ON CONFLICT ("code") DO NOTHING;
