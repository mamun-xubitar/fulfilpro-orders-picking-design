-- CreateEnum
CREATE TYPE "TaskDueType" AS ENUM ('STANDARD', 'URGENT', 'CUSTOM');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueType" "TaskDueType" NOT NULL DEFAULT 'CUSTOM';
