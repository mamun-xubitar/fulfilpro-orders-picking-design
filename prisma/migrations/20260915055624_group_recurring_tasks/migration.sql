-- CreateTable
CREATE TABLE "RecurringTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueType" "TaskDueType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "recurrenceType" "TaskRecurrenceType" NOT NULL,
    "recurrenceEndDate" TIMESTAMP(3) NOT NULL,
    "nextOccurrenceAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "assignerId" TEXT NOT NULL,
    "assignerName" TEXT NOT NULL,
    "assignerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTaskAssignee" (
    "id" TEXT NOT NULL,
    "recurringTaskId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "assigneeEmail" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringTaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringTask_stoppedAt_nextOccurrenceAt_idx" ON "RecurringTask"("stoppedAt", "nextOccurrenceAt");

-- CreateIndex
CREATE INDEX "RecurringTask_assignerId_idx" ON "RecurringTask"("assignerId");

-- CreateIndex
CREATE INDEX "RecurringTaskAssignee_assigneeId_idx" ON "RecurringTaskAssignee"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringTaskAssignee_recurringTaskId_assigneeId_key" ON "RecurringTaskAssignee"("recurringTaskId", "assigneeId");

-- AddForeignKey
ALTER TABLE "RecurringTaskAssignee" ADD CONSTRAINT "RecurringTaskAssignee_recurringTaskId_fkey" FOREIGN KEY ("recurringTaskId") REFERENCES "RecurringTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add the new nullable FK column on Task (dropping the old recurrence
-- columns happens further below, after the data migration reads them)
ALTER TABLE "Task" ADD COLUMN "recurringTaskId" TEXT;

-- CreateIndex
CREATE INDEX "Task_recurringTaskId_idx" ON "Task"("recurringTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurringTaskId_fkey" FOREIGN KEY ("recurringTaskId") REFERENCES "RecurringTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration -------------------------------------------------------------
-- Legacy design: one "recurring parent" Task per assignee (isRecurringParent = true).
-- New design: one RecurringTask "group" holding all its assignees. Group together
-- legacy parents that were clearly created by the same "Assign Task" submission
-- (same assigner, title, recurrence settings, and created in the same second).

-- One row per legacy group, with a freshly generated id. gen_random_uuid()/pgcrypto
-- is not assumed to be installed, so build a UUID from md5() instead.
CREATE TEMP TABLE "legacy_group_key" AS
SELECT
  "assignerId",
  "assignerName",
  "assignerEmail",
  title,
  "recurrenceType",
  "recurrenceEndDate",
  "dueType",
  date_trunc('second', "createdAt") AS created_bucket,
  md5(random()::text || clock_timestamp()::text || title) AS group_id
FROM "Task"
WHERE "isRecurringParent" = true
GROUP BY "assignerId", "assignerName", "assignerEmail", title, "recurrenceType", "recurrenceEndDate", "dueType", date_trunc('second', "createdAt");

-- Every legacy parent Task, joined to the group it belongs to.
CREATE TEMP TABLE "legacy_group_member" AS
SELECT
  t.id AS task_id,
  t."assigneeId",
  t."assigneeName",
  t."assigneeEmail",
  t.description,
  t."dueDate",
  t."nextOccurrenceAt",
  t."recurrenceStoppedAt",
  t."createdAt",
  g.group_id
FROM "Task" t
JOIN "legacy_group_key" g
  ON t."assignerId" = g."assignerId"
 AND t.title = g.title
 AND t."recurrenceType" IS NOT DISTINCT FROM g."recurrenceType"
 AND t."recurrenceEndDate" IS NOT DISTINCT FROM g."recurrenceEndDate"
 AND t."dueType" = g."dueType"
 AND date_trunc('second', t."createdAt") = g.created_bucket
WHERE t."isRecurringParent" = true;

-- One RecurringTask per legacy group. description/dueDate come from the earliest
-- member (used as the group default); nextOccurrenceAt is the earliest of the
-- group's members; the group is only marked stopped if every member was stopped.
INSERT INTO "RecurringTask" (id, title, description, "dueType", "dueDate", "recurrenceType", "recurrenceEndDate", "nextOccurrenceAt", "stoppedAt", "assignerId", "assignerName", "assignerEmail", "createdAt", "updatedAt")
SELECT
  g.group_id,
  g.title,
  (SELECT m2.description FROM "legacy_group_member" m2 WHERE m2.group_id = g.group_id ORDER BY m2."createdAt" ASC LIMIT 1),
  g."dueType",
  (SELECT m2."dueDate" FROM "legacy_group_member" m2 WHERE m2.group_id = g.group_id ORDER BY m2."createdAt" ASC LIMIT 1),
  g."recurrenceType",
  g."recurrenceEndDate",
  (SELECT min(m2."nextOccurrenceAt") FROM "legacy_group_member" m2 WHERE m2.group_id = g.group_id),
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM "legacy_group_member" m2 WHERE m2.group_id = g.group_id AND m2."recurrenceStoppedAt" IS NULL)
    THEN (SELECT max(m2."recurrenceStoppedAt") FROM "legacy_group_member" m2 WHERE m2.group_id = g.group_id)
    ELSE NULL
  END,
  g."assignerId",
  g."assignerName",
  g."assignerEmail",
  (SELECT min(m2."createdAt") FROM "legacy_group_member" m2 WHERE m2.group_id = g.group_id),
  now()
FROM "legacy_group_key" g;

-- One RecurringTaskAssignee per legacy parent. If the group ended up active, drop
-- members that had been individually stopped (their history is kept as Tasks, but
-- they are no longer an active assignee of the group).
INSERT INTO "RecurringTaskAssignee" (id, "recurringTaskId", "assigneeId", "assigneeName", "assigneeEmail", description, "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || m.task_id),
  m.group_id,
  m."assigneeId",
  m."assigneeName",
  m."assigneeEmail",
  m.description,
  m."createdAt"
FROM "legacy_group_member" m
JOIN "RecurringTask" rt ON rt.id = m.group_id
WHERE rt."stoppedAt" IS NOT NULL OR m."recurrenceStoppedAt" IS NULL
ON CONFLICT ("recurringTaskId", "assigneeId") DO NOTHING;

-- Point every legacy parent Task, and its generated children, at the new group.
UPDATE "Task" t
SET "recurringTaskId" = m.group_id
FROM "legacy_group_member" m
WHERE t.id = m.task_id;

UPDATE "Task" c
SET "recurringTaskId" = m.group_id
FROM "legacy_group_member" m
WHERE c."parentTaskId" = m.task_id;

DROP TABLE "legacy_group_member";
DROP TABLE "legacy_group_key";

-- End data migration ----------------------------------------------------------

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_parentTaskId_fkey";

-- DropIndex
DROP INDEX "Task_isRecurringParent_recurrenceStoppedAt_nextOccurrenceAt_idx";

-- DropIndex
DROP INDEX "Task_parentTaskId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "isRecurringParent",
DROP COLUMN "nextOccurrenceAt",
DROP COLUMN "parentTaskId",
DROP COLUMN "recurrenceEndDate",
DROP COLUMN "recurrenceStoppedAt",
DROP COLUMN "recurrenceType";
