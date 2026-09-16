import prisma from '@/lib/prisma.server';
import { RecurringTaskModel } from '@/models/recurring-task.model.server';
import type { TaskRow } from '@/models/task.model.server';
import { fireTaskEvent } from '@/lib/task-events.server';
import { resolveDueDate, resolveOccurrenceDueDate, getSettingsTimezone } from '@/lib/task-due-date.server';
import { computeNextOccurrenceAt } from '@/lib/task-recurrence.server';
import type { TaskDueType, TaskRecurrenceType } from '@prisma/client';

const recurringTaskModel = new RecurringTaskModel();

type Session = { user: { id: string; name?: string | null; email?: string | null; role?: string | null } };
type Person = { id: string; name: string; email: string };

function isAdmin(session: Session) {
  return session.user.role === 'admin';
}

export class RecurringTaskController {
  async createFromParsed(params: {
    parsed: { title: string; perAssigneeDescription: boolean; description: string; descriptions: Record<string, string>; dueDateStr: string };
    dueType: TaskDueType;
    recurrenceType: TaskRecurrenceType;
    recurrenceEndDate: Date;
    assigner: Person;
    assignees: Person[];
    timezone: string;
  }): Promise<TaskRow[]> {
    const { parsed, dueType, recurrenceType, recurrenceEndDate, assigner, assignees, timezone } = params;
    const now = new Date();
    const nextOccurrenceAt = computeNextOccurrenceAt(now, timezone, recurrenceType);

    const descriptionFor = (assigneeId: string) =>
      parsed.perAssigneeDescription ? parsed.descriptions[assigneeId]!.trim() : parsed.description;

    const assigneeEntries = await Promise.all(
      assignees.map(async (a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        description: descriptionFor(a.id),
        dueDate: await resolveDueDate(dueType, a.id, parsed.dueDateStr, now),
      })),
    );

    const { group, tasks } = await recurringTaskModel.createWithTasks({
      group: {
        title: parsed.title,
        description: descriptionFor(assignees[0].id),
        dueType,
        dueDate: assigneeEntries[0].dueDate,
        recurrenceType,
        recurrenceEndDate,
        nextOccurrenceAt,
        assigner,
      },
      assignees: assigneeEntries,
    });

    for (const task of tasks) {
      void fireTaskEvent('assigned', task.id, task.title, task.assigneeId, task.assigneeName, task.assigneeEmail, group.assignerName).catch(() => {});
    }

    return tasks;
  }

  async list(searchParams: URLSearchParams, session: Session) {
    const admin = isAdmin(session);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
    const search = searchParams.get('search') ?? undefined;
    const assigneeId = searchParams.get('assigneeId') ?? undefined;
    const scopeUserId = admin ? undefined : session.user.id;
    const dueTypeParam = searchParams.get('dueType') ?? undefined;
    const dueType = dueTypeParam && ['STANDARD', 'URGENT', 'CUSTOM'].includes(dueTypeParam) ? (dueTypeParam as TaskDueType) : undefined;

    const result = await recurringTaskModel.findMany({ assigneeId, scopeUserId, search, dueType, page, pageSize });
    return { data: result, message: 'Recurring tasks retrieved' };
  }

  async listTasks(id: string, session: Session) {
    const group = await recurringTaskModel.findById(id);
    if (!group) return { error: { message: 'Recurring task not found', status: 404 } };

    const uid = session.user.id;
    const admin = isAdmin(session);
    const isAssigner = group.assignerId === uid;
    const isAssignee = group.assignees.some((a) => a.assigneeId === uid);
    if (!admin && !isAssigner && !isAssignee) return { error: { message: 'Forbidden', status: 403 } };

    const onlyAssigneeId = admin || isAssigner ? undefined : uid;
    const tasks = await recurringTaskModel.findTasks(id, uid, onlyAssigneeId);
    return { data: tasks, message: 'Tasks retrieved' };
  }

  async stop(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const group = await recurringTaskModel.findById(id);
    if (!group) return { error: { message: 'Recurring task not found', status: 404 } };
    if (group.assignerId !== session.user.id) return { error: { message: 'Only the assigner can stop this recurring task', status: 403 } };

    await recurringTaskModel.stop(id);
    return { data: null, message: 'Recurring task stopped' };
  }

  async resume(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const group = await recurringTaskModel.findById(id);
    if (!group) return { error: { message: 'Recurring task not found', status: 404 } };
    if (group.assignerId !== session.user.id) return { error: { message: 'Only the assigner can resume this recurring task', status: 403 } };
    if (!group.stoppedAt) return { error: { message: 'This recurring task is not stopped', status: 400 } };
    if (new Date(group.recurrenceEndDate) <= new Date()) {
      return { error: { message: 'This recurring task has already ended', status: 400 } };
    }

    // Resuming re-anchors the next occurrence to today, rather than resuming from wherever
    // nextOccurrenceAt was left when stopped — otherwise a long-stopped series would generate
    // a burst of back-dated catch-up tasks, one per missed day, until it caught up to now.
    const timezone = await getSettingsTimezone();
    const nextOccurrenceAt = computeNextOccurrenceAt(new Date(), timezone, group.recurrenceType);
    await recurringTaskModel.resume(id, nextOccurrenceAt);
    return { data: null, message: 'Recurring task resumed' };
  }

  async delete(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const group = await recurringTaskModel.findById(id);
    if (!group) return { error: { message: 'Recurring task not found', status: 404 } };
    if (group.assignerId !== session.user.id) return { error: { message: 'Only the assigner can delete this recurring task', status: 403 } };

    await recurringTaskModel.delete(id);
    return { data: null, message: 'Recurring task deleted' };
  }

  async addAssignee(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const group = await recurringTaskModel.findById(id);
    if (!group) return { error: { message: 'Recurring task not found', status: 404 } };
    if (group.assignerId !== session.user.id) {
      return { error: { message: 'Only the assigner can manage assignees for this recurring task', status: 403 } };
    }
    // Adding an assignee to a stopped series still creates their one task now — it just
    // doesn't resume future generation, since the series stays stopped.
    if (new Date(group.recurrenceEndDate) <= new Date()) {
      return { error: { message: 'This recurring task has ended', status: 400 } };
    }

    const b = body as Record<string, unknown>;
    const assigneeId = typeof b.assigneeId === 'string' ? b.assigneeId.trim() : '';
    const description = typeof b.description === 'string' ? b.description.trim() : '';
    if (!assigneeId) return { error: { message: 'Validation failed', errors: ['assigneeId: Assignee is required'], status: 400 } };

    if (group.assignees.some((a) => a.assigneeId === assigneeId)) {
      return { error: { message: 'This user is already assigned to this recurring task', status: 409 } };
    }

    const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true, name: true, email: true } });
    if (!user) return { error: { message: 'Validation failed', errors: ['assigneeId: User not found'], status: 400 } };

    const timezone = await getSettingsTimezone();
    const dueDate = await resolveOccurrenceDueDate({ dueType: group.dueType, dueDate: new Date(group.dueDate) }, assigneeId, timezone);

    const { group: updatedGroup, task } = await recurringTaskModel.addAssigneeWithTask(
      id,
      { id: user.id, name: user.name ?? user.email ?? '', email: user.email ?? '', description: description || group.description },
      { title: group.title, dueType: group.dueType, dueDate, assigner: { id: group.assignerId, name: group.assignerName, email: group.assignerEmail } },
    );

    void fireTaskEvent('assigned', task.id, task.title, task.assigneeId, task.assigneeName, task.assigneeEmail, group.assignerName).catch(() => {});

    return { data: updatedGroup, message: 'Assignee added' };
  }

  async removeAssignee(id: string, assigneeId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const group = await recurringTaskModel.findById(id);
    if (!group) return { error: { message: 'Recurring task not found', status: 404 } };
    if (group.assignerId !== session.user.id) {
      return { error: { message: 'Only the assigner can manage assignees for this recurring task', status: 403 } };
    }

    if (!group.assignees.some((a) => a.assigneeId === assigneeId)) {
      return { error: { message: 'This user is not assigned to this recurring task', status: 404 } };
    }
    if (group.assignees.length <= 1) {
      return { error: { message: 'Stop the recurring task instead of removing its last assignee', status: 400 } };
    }

    const updated = await recurringTaskModel.removeAssignee(id, assigneeId);
    return { data: updated, message: 'Assignee removed' };
  }
}
