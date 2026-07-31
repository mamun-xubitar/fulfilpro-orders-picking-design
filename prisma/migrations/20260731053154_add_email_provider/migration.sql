-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "emailProvider" TEXT NOT NULL DEFAULT 'google',
ADD COLUMN     "mailersendApiToken" TEXT,
ADD COLUMN     "mailersendFromEmail" TEXT;
