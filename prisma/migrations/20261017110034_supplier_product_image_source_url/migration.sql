-- AlterTable
ALTER TABLE "SupplierProductImage" ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "SupplierProductImage_sourceUrl_idx" ON "SupplierProductImage"("sourceUrl");

-- CreateIndex
CREATE INDEX "SupplierProductImage_url_idx" ON "SupplierProductImage"("url");
