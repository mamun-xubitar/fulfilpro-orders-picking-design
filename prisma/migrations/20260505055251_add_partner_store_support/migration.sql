-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "partnerStoreId" TEXT;

-- CreateIndex
CREATE INDEX "Store_partnerStoreId_idx" ON "Store"("partnerStoreId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_partnerStoreId_fkey" FOREIGN KEY ("partnerStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
