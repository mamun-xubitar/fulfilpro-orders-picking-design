-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "appManagementToken" TEXT,
ADD COLUMN     "appManagementTokenExpiresAt" TIMESTAMP(3);
