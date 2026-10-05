-- Remove the unused DRAFT and CONFIRMED purchase order statuses. Existing rows move to REQUESTED.
UPDATE "PurchaseOrder" SET "status" = 'REQUESTED' WHERE "status" IN ('DRAFT', 'CONFIRMED');

-- Postgres cannot drop enum values, so recreate the type.
CREATE TYPE "PurchaseOrderStatus_new" AS ENUM ('REQUESTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE "PurchaseOrderStatus_new" USING ("status"::text::"PurchaseOrderStatus_new");
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

DROP TYPE "PurchaseOrderStatus";
ALTER TYPE "PurchaseOrderStatus_new" RENAME TO "PurchaseOrderStatus";
