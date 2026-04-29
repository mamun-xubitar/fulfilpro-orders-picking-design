-- DropIndex
DROP INDEX IF EXISTS "User_username_idx";
DROP INDEX IF EXISTS "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "User" DROP COLUMN IF EXISTS "username";
