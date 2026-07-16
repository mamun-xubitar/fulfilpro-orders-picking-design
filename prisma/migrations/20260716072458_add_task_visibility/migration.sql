-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "taskVisibilityByUser" JSONB NOT NULL DEFAULT '{}';
