-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_name_key" ON "InventoryCategory"("name");

-- AlterTable
ALTER TABLE "SupplierProduct" ADD COLUMN "inventoryCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "SupplierProduct_inventoryCategoryId_idx" ON "SupplierProduct"("inventoryCategoryId");

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_inventoryCategoryId_fkey" FOREIGN KEY ("inventoryCategoryId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
