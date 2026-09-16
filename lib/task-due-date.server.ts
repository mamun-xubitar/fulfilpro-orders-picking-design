import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { computeUrgentDueDate } from '@/lib/auth-policy.server';
import type { TaskDueType } from '@prisma/client';

export async function getSettingsTimezone(): Promise<string> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { timezone: true } });
  return settings?.timezone ?? 'Australia/Sydney';
}

export async function resolveDueDate(dueType: TaskDueType, assigneeId: string, dueDateStr?: string, now: Date = new Date()): Promise<Date> {
  if (dueType === 'STANDARD') return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (dueType === 'URGENT') return computeUrgentDueDate(assigneeId, now);
  return new Date(dueDateStr ?? '');
}

/** Resolves the due date for one occurrence of a recurring task's assignee.
 * CUSTOM tasks reuse the group's stored time-of-day, anchored to today; STANDARD/URGENT
 * are resolved fresh per assignee, same as a one-off task. */
export async function resolveOccurrenceDueDate(
  group: { dueType: TaskDueType; dueDate: Date },
  assigneeId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<Date> {
  if (group.dueType === 'CUSTOM') {
    const todayStr = moment(now).tz(timezone).format('YYYY-MM-DD');
    return applyTimeOfDayToDate(group.dueDate, todayStr, timezone);
  }
  return resolveDueDate(group.dueType, assigneeId, undefined, now);
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
