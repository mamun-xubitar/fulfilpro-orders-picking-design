-- Rename SupplierProduct.remarks -> productRemark (data-preserving)
ALTER TABLE "SupplierProduct" RENAME COLUMN "remarks" TO "productRemark";

-- Rename PurchaseOrder.remark -> poRemark (data-preserving)
ALTER TABLE "PurchaseOrder" RENAME COLUMN "remark" TO "poRemark";

-- New columns
ALTER TABLE "PurchaseOrder" ADD COLUMN "shippingRemark" TEXT;
ALTER TABLE "SupplierProduct" ADD COLUMN "poQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SupplierProduct" ADD COLUMN "omitted" BOOLEAN NOT NULL DEFAULT false;
