/*
  Warnings:

  - Changed the type of `number` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "number",
ADD COLUMN     "number" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
