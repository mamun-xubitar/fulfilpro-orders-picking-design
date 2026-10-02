-- AlterEnum
ALTER TYPE "StocktakeStatus" ADD VALUE 'COUNTED';

-- AlterTable
ALTER TABLE "Stocktake" ADD COLUMN "number" SERIAL NOT NULL,
ADD COLUMN "countedById" TEXT,
ADD COLUMN "countedByName" TEXT,
ADD COLUMN "countedAt" TIMESTAMP(3),
ADD COLUMN "syncedById" TEXT,
ADD COLUMN "syncedByName" TEXT;

-- AlterTable
ALTER TABLE "StocktakeItem" ADD COLUMN "locationId" TEXT,
ADD COLUMN "locationName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Stocktake_number_key" ON "Stocktake"("number");

-- CreateIndex
CREATE INDEX "Stocktake_status_createdAt_idx" ON "Stocktake"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StocktakeItem_locationId_idx" ON "StocktakeItem"("locationId");

-- AddForeignKey
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
