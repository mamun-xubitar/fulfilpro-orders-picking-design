-- AlterTable
ALTER TABLE "AppSettings"
ADD COLUMN "googleEmail" TEXT,
ADD COLUMN "googleAccessToken" TEXT,
ADD COLUMN "googleRefreshToken" TEXT,
ADD COLUMN "googleTokenExpiresAt" TIMESTAMP(3);
