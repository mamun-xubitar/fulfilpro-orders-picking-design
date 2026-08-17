import moment from 'moment-timezone';
import { computeUrgentDueDate } from '@/lib/auth-policy.server';
import type { TaskDueType } from '@prisma/client';

export async function resolveDueDate(dueType: TaskDueType, assigneeId: string, dueDateStr?: string, now: Date = new Date()): Promise<Date> {
  if (dueType === 'STANDARD') return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (dueType === 'URGENT') return computeUrgentDueDate(assigneeId, now);
  return new Date(dueDateStr ?? '');
}

export function applyTimeOfDayToDate(sourceDate: Date, targetDateStr: string, timezone: string): Date {
  const time = moment(sourceDate).tz(timezone);
  return moment
    .tz(targetDateStr, 'YYYY-MM-DD', timezone)
    .hours(time.hours())
    .minutes(time.minutes())
    .seconds(0)
    .milliseconds(0)
    .toDate();
}
