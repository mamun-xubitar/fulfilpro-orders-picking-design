-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "globalMarginPercent" DECIMAL(6,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rate" DECIMAL(14,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_code_key" ON "CurrencyRate"("code");
