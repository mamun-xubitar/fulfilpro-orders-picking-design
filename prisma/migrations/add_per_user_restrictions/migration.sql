-- Add per-user restriction fields to User table
ALTER TABLE "User" ADD COLUMN "staffAccessDays" JSONB NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri"]';
ALTER TABLE "User" ADD COLUMN "staffAccessStart" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "User" ADD COLUMN "staffAccessEnd" TEXT NOT NULL DEFAULT '16:00';
ALTER TABLE "User" ADD COLUMN "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "User" ADD COLUMN "inactivityTimeoutMinutes" INTEGER;

-- Backfill existing non-admin users from current AppSettings values
UPDATE "User" 
SET 
  "staffAccessDays" = (SELECT "staffAccessDays" FROM "AppSettings" WHERE id = 'default'),
  "staffAccessStart" = (SELECT "staffAccessStart" FROM "AppSettings" WHERE id = 'default'),
  "staffAccessEnd" = (SELECT "staffAccessEnd" FROM "AppSettings" WHERE id = 'default'),
  "sessionTimeoutMinutes" = (SELECT "sessionTimeoutMinutes" FROM "AppSettings" WHERE id = 'default'),
  "inactivityTimeoutMinutes" = (SELECT "inactivityTimeoutMinutes" FROM "AppSettings" WHERE id = 'default')
WHERE role != 'admin';
