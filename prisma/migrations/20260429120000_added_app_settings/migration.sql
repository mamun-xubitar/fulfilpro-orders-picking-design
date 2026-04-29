-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "staffAccessDays" JSONB NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
    "staffAccessStart" TEXT NOT NULL DEFAULT '08:00',
    "staffAccessEnd" TEXT NOT NULL DEFAULT '16:00',
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
