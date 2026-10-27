-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoiceSequence" INTEGER;

-- Orders that already exist keep the number their invoice shows today (store prefix + order number),
-- so an issued invoice never changes. They carry no sequence: the global counter starts after them.
UPDATE "Order" o
SET "invoiceNumber" = COALESCE(
  (SELECT NULLIF(BTRIM(s."invoicePrefix"), '') FROM "StoreInvoiceSetting" s WHERE s."storeId" = o."storeId"),
  ''
) || o."number"::text;
