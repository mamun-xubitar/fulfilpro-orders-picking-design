-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedStoreIds" JSONB NOT NULL DEFAULT '[]';
