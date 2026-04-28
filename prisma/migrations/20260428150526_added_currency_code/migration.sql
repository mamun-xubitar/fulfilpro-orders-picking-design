/*
  Warnings:

  - You are about to drop the column `priceAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `priceCurrency` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "priceAmount",
DROP COLUMN "priceCurrency",
ADD COLUMN     "currencyCode" TEXT;
