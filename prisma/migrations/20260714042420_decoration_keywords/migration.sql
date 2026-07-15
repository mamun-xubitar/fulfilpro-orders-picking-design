-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "embroideryKeywords" JSONB NOT NULL DEFAULT '["embroider","emb"]',
ADD COLUMN     "printKeywords" JSONB NOT NULL DEFAULT '["print"]';
