import prisma from '@/lib/prisma.server';
import { sendAppMail } from '@/lib/email.server';
import { createNotification } from '@/lib/notifications.server';
import { TaskModel } from '@/models/task.model.server';

const taskModel = new TaskModel();

function toReminderTimes(value: unknown): string[] {
  if (!Array.isArray(value)) return ['08:00', '12:00', '16:00'];
  return value.filter((v): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v));
}

export async function runTaskReminderCheck(now: Date) {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { taskReminderTimes: true, timezone: true },
  });

  const reminderTimes = toReminderTimes(settings?.taskReminderTimes);
  const tz = settings?.timezone ?? 'Australia/Sydney';

  const currentHHmm = now.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  });

  if (!reminderTimes.includes(currentHHmm)) return;

  const assignees = await taskModel.pendingForAllAssignees();
  if (assignees.length === 0) return;

  for (const assignee of assignees) {
    const total = assignee.pending + assignee.overdue + assignee.seriouslyLate;
    if (total === 0) continue;

    const parts: string[] = [];
    if (assignee.pending > 0) parts.push(`${assignee.pending} pending`);
    if (assignee.overdue > 0) parts.push(`${assignee.overdue} overdue`);
    if (assignee.seriouslyLate > 0) parts.push(`${assignee.seriouslyLate} seriously late`);
    const breakdown = parts.join(', ');
    const body = `Task reminder: you have ${total} open task(s) — ${breakdown}.`;
    const subject = `Task reminder: ${total} open task(s)`;
    const html = buildReminderEmail(assignee.assigneeName, total, assignee.pending, assignee.overdue, assignee.seriouslyLate);

    await Promise.all([
      sendAppMail({ to: [assignee.assigneeEmail], subject, html, text: body }).catch(() => {}),
      createNotification({
        recipientId: assignee.assigneeId,
        type: 'task_reminder',
        title: 'Task reminder',
        body,
      }),
    ]);
  }
}

function buildReminderEmail(
  name: string,
  total: number,
  pending: number,
  overdue: number,
  seriouslyLate: number,
) {
  const rows = [
    pending > 0 ? `<tr><td style="${TD}">Pending</td><td style="${TD}">${pending}</td></tr>` : '',
    overdue > 0 ? `<tr><td style="${TD}">Overdue (1–2 days)</td><td style="${TD}">${overdue}</td></tr>` : '',
    seriouslyLate > 0 ? `<tr><td style="${TD}">Seriously late (&gt;2 days)</td><td style="${TD}">${seriouslyLate}</td></tr>` : '',
  ].join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
      <h2 style="font-size:16px;margin-bottom:8px">Task Reminder</h2>
      <p style="color:#555;margin:0 0 16px">Hi ${escapeHtml(name)}, you have <strong>${total}</strong> open task(s):</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr>
          <th style="${TH}">Status</th>
          <th style="${TH}">Count</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:12px;color:#888;margin-top:16px">Log in to view and complete your tasks.</p>
    </div>`;
}

const TH = 'border:1px solid #ddd;padding:6px 8px;background:#f5f5f5;text-align:left;font-size:11px;text-transform:uppercase;color:#555;';
const TD = 'border:1px solid #ddd;padding:6px 8px;vertical-align:top;';

function escapeHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
