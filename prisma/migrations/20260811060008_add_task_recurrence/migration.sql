-- CreateEnum
CREATE TYPE "TaskRecurrenceType" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isRecurringParent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextOccurrenceAt" TIMESTAMP(3),
ADD COLUMN     "parentTaskId" TEXT,
ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3),
ADD COLUMN     "recurrenceStoppedAt" TIMESTAMP(3),
ADD COLUMN     "recurrenceType" "TaskRecurrenceType";

-- CreateIndex
CREATE INDEX "Task_isRecurringParent_recurrenceStoppedAt_nextOccurrenceAt_idx" ON "Task"("isRecurringParent", "recurrenceStoppedAt", "nextOccurrenceAt");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
