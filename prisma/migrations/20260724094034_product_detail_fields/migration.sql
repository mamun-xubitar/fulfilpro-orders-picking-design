-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "descriptionHtml" TEXT,
ADD COLUMN     "images" JSONB;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "cost" DECIMAL(14,2),
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "inventoryPolicy" TEXT NOT NULL DEFAULT 'DENY',
ADD COLUMN     "optionValues" JSONB;

-- CreateIndex
CREATE INDEX "Product_handle_idx" ON "Product"("handle");
