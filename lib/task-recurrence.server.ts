import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { TaskModel } from '@/models/task.model.server';
import { resolveDueDate, applyTimeOfDayToDate } from '@/lib/task-due-date.server';
import { fireTaskEvent } from '@/lib/task-events.server';
import type { Task, TaskRecurrenceType } from '@prisma/client';

const taskModel = new TaskModel();
const RECURRING_CHECK_TIME = '00:05';

export function computeNextOccurrenceAt(anchor: Date, timezone: string, type: TaskRecurrenceType): Date {
  return moment
    .tz(anchor, timezone)
    .add(type === 'DAILY' ? 1 : 7, 'days')
    .startOf('day')
    .toDate();
}

async function computeChildDueDate(parent: Task, todayStr: string, timezone: string, now: Date): Promise<Date> {
  if (parent.dueType === 'CUSTOM') {
    return applyTimeOfDayToDate(parent.dueDate, todayStr, timezone);
  }
  return resolveDueDate(parent.dueType, parent.assigneeId, undefined, now);
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

  const parents = await taskModel.findActiveRecurringParentsDueForGeneration(now);
  if (parents.length === 0) return;

  const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');

  for (const parent of parents) {
    try {
      const dueDate = await computeChildDueDate(parent, todayStr, timezone, now);
      const nextOccurrenceAt = computeNextOccurrenceAt(parent.nextOccurrenceAt ?? now, timezone, parent.recurrenceType as TaskRecurrenceType);
      const child = await taskModel.createRecurringChild(parent, dueDate, nextOccurrenceAt);
      void fireTaskEvent('assigned', child.id, child.title, child.assigneeId, child.assigneeName, child.assigneeEmail, parent.assignerName).catch(() => {});
    } catch (error) {
      console.error(`Recurring task generation failed for parent ${parent.id}`, error);
    }
  }
}
