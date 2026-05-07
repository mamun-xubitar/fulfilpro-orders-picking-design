/*
  Warnings:

  - You are about to drop the column `windowEndedAt` on the `OrderSyncJob` table. All the data in the column will be lost.
  - You are about to drop the column `windowStartedAt` on the `OrderSyncJob` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderSyncJob" DROP COLUMN "windowEndedAt",
DROP COLUMN "windowStartedAt";
