-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "decorationDigestMode" TEXT NOT NULL DEFAULT 'global_time',
ADD COLUMN     "decorationDigestRecipientUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "decorationDigestTime" TEXT NOT NULL DEFAULT '17:00';
