import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { RecurringTaskModel } from '@/models/recurring-task.model.server';
import { resolveOccurrenceDueDate } from '@/lib/task-due-date.server';
import { fireTaskEvent } from '@/lib/task-events.server';
import type { TaskRecurrenceType } from '@prisma/client';

const recurringTaskModel = new RecurringTaskModel();
const RECURRING_CHECK_TIME = '00:05';

export function computeNextOccurrenceAt(anchor: Date, timezone: string, type: TaskRecurrenceType): Date {
  return moment
    .tz(anchor, timezone)
    .add(type === 'DAILY' ? 1 : 7, 'days')
    .startOf('day')
    .toDate();
}

export async function runRecurringTaskCheck(now: Date) {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { timezone: true } });
  const timezone = settings?.timezone ?? 'Australia/Sydney';

  const currentHHmm = now.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  if (currentHHmm !== RECURRING_CHECK_TIME) return;

  const groups = await recurringTaskModel.findActiveDueForGeneration(now);
  if (groups.length === 0) return;

  for (const group of groups) {
    try {
      const occurrences = await Promise.all(
        group.assignees.map(async (assignee) => ({
          assigneeId: assignee.assigneeId,
          assigneeName: assignee.assigneeName,
          assigneeEmail: assignee.assigneeEmail,
          title: group.title,
          description: assignee.description,
          dueType: group.dueType,
          dueDate: await resolveOccurrenceDueDate(group, assignee.assigneeId, timezone, now),
          assignerId: group.assignerId,
          assignerName: group.assignerName,
          assignerEmail: group.assignerEmail,
        })),
      );

      const nextOccurrenceAt = computeNextOccurrenceAt(group.nextOccurrenceAt, timezone, group.recurrenceType);
      const tasks = await recurringTaskModel.createOccurrences(group.id, occurrences, nextOccurrenceAt);

      for (const task of tasks) {
        void fireTaskEvent('assigned', task.id, task.title, task.assigneeId, task.assigneeName, task.assigneeEmail, group.assignerName).catch(() => {});
      }
    } catch (error) {
      console.error(`Recurring task generation failed for group ${group.id}`, error);
    }
  }
}
