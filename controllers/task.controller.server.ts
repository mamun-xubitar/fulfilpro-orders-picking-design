import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { TaskModel, type TaskState2 } from '@/models/task.model.server';
import { RecurringTaskModel } from '@/models/recurring-task.model.server';
import { RecurringTaskController } from '@/controllers/recurring-task.controller.server';
import { fireTaskEvent, fireMessageEvent } from '@/lib/task-events.server';
import { resolveDueDate, getSettingsTimezone } from '@/lib/task-due-date.server';
import { computeUrgentDueDate } from '@/lib/auth-policy.server';
import { getTaskVisibleUserIds, getTaskVisibleUsers } from '@/lib/task-visibility.server';
import type { SavedFile } from '@/lib/uploads.server';
import type { TaskDueType, TaskRecurrenceType } from '@prisma/client';

const taskModel = new TaskModel();
const recurringTaskModel = new RecurringTaskModel();
const recurringTaskController = new RecurringTaskController();
const DUE_TYPES: TaskDueType[] = ['STANDARD', 'URGENT', 'CUSTOM'];
const RECURRENCE_TYPES: TaskRecurrenceType[] = ['DAILY', 'WEEKLY'];

function isTaskDueType(value: string): value is TaskDueType {
  return (DUE_TYPES as string[]).includes(value);
}

function isRecurrenceType(value: string): value is TaskRecurrenceType {
  return (RECURRENCE_TYPES as string[]).includes(value);
}

type Session = { user: { id: string; name?: string | null; email?: string | null; role?: string | null } };

function isAdmin(session: Session) {
  return session.user.role === 'admin';
}

function userName(session: Session) {
  return session.user.name ?? session.user.email ?? 'Unknown';
}

type CreateBody = {
  title: string;
  assigneeIds: string[];
  perAssigneeDescription: boolean;
  description: string;
  descriptions: Record<string, string>;
  dueType: string;
  dueDateStr: string;
  recurrence: string;
  recurrenceEndDateStr: string;
};

function parseCreateBody(body: unknown): CreateBody {
  const b = body as Record<string, unknown>;
  const assigneeIdsRaw = Array.isArray(b.assigneeIds) ? b.assigneeIds : [];
  const descriptionsRaw = b.descriptions && typeof b.descriptions === 'object' ? (b.descriptions as Record<string, unknown>) : {};
  const descriptions: Record<string, string> = {};
  for (const [id, value] of Object.entries(descriptionsRaw)) {
    if (typeof value === 'string') descriptions[id] = value;
  }
  return {
    title: String(b.title ?? '').trim(),
    assigneeIds: assigneeIdsRaw.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()),
    perAssigneeDescription: Boolean(b.perAssigneeDescription),
    description: String(b.description ?? '').trim(),
    descriptions,
    dueType: String(b.dueType ?? '').trim(),
    dueDateStr: String(b.dueDate ?? '').trim(),
    recurrence: String(b.recurrence ?? '').trim(),
    recurrenceEndDateStr: String(b.recurrenceEndDate ?? '').trim(),
  };
}

function validateCreateBody(parsed: CreateBody, todayStr: string): string[] {
  const errors: string[] = [];
  if (!parsed.title) errors.push('title: Title is required');
  if (parsed.assigneeIds.length === 0) errors.push('assigneeIds: At least one assignee is required');

  if (parsed.perAssigneeDescription) {
    for (const id of parsed.assigneeIds) {
      if (!parsed.descriptions[id]?.trim()) errors.push(`descriptions.${id}: Description is required`);
    }
  } else if (!parsed.description) {
    errors.push('description: Description is required');
  }

  if (!parsed.dueType || !isTaskDueType(parsed.dueType)) errors.push('dueType: Due type is required');
  if (parsed.dueType === 'CUSTOM' && (!parsed.dueDateStr || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(parsed.dueDateStr))) {
    errors.push('dueDate: Valid due date and time is required');
  }

  if (parsed.recurrence) {
    if (!isRecurrenceType(parsed.recurrence)) errors.push('recurrence: Invalid recurrence type');
    if (!parsed.recurrenceEndDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.recurrenceEndDateStr)) {
      errors.push('recurrenceEndDate: A valid end date is required');
    } else if (parsed.recurrenceEndDateStr <= todayStr) {
      errors.push('recurrenceEndDate: End date must be after today');
    }
  }

  return errors;
}

export class TaskController {
  async list(searchParams: URLSearchParams, session: Session) {
    const admin = isAdmin(session);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
    const state = (searchParams.get('state') || 'all') as TaskState2;
    const search = searchParams.get('search') ?? undefined;
    const assigneeId = searchParams.get('assigneeId') ?? undefined;
    const scopeUserId = admin ? undefined : session.user.id;
    const dueTypeParam = searchParams.get('dueType') ?? undefined;
    const dueType = dueTypeParam && isTaskDueType(dueTypeParam) ? dueTypeParam : undefined;

    const result = await taskModel.list({ assigneeId, scopeUserId, state, search, dueType, page, pageSize, viewerId: session.user.id });
    return { data: result, message: 'Tasks retrieved' };
  }

  async getOne(id: string, session: Session) {
    const task = await taskModel.findById(id);
    if (!task) return { error: { message: 'Task not found', status: 404 } };

    const uid = session.user.id;
    if (!isAdmin(session) && task.assigneeId !== uid && task.assignerId !== uid) {
      return { error: { message: 'Forbidden', status: 403 } };
    }
    return { data: task, message: 'Task retrieved' };
  }

  async create(body: unknown, session: Session) {
    const parsed = parseCreateBody(body);
    const timezone = await getSettingsTimezone();
    const todayStr = moment().tz(timezone).format('YYYY-MM-DD');

    const errors = validateCreateBody(parsed, todayStr);
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const dueType = parsed.dueType as TaskDueType;
    const recurrenceType = isRecurrenceType(parsed.recurrence) ? parsed.recurrence : undefined;

    const [assigner, assignees] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true } }),
      prisma.user.findMany({ where: { id: { in: parsed.assigneeIds } }, select: { id: true, name: true, email: true } }),
    ]);
    if (!assigner) return { error: { message: 'Session user not found', status: 400 } };
    if (assignees.length !== parsed.assigneeIds.length) {
      return { error: { message: 'Validation failed', errors: ['assigneeIds: One or more users were not found'], status: 400 } };
    }
    if (!isAdmin(session)) {
      const visibleIds = await getTaskVisibleUserIds(session.user.id);
      if (parsed.assigneeIds.some((id) => !visibleIds.includes(id))) {
        return { error: { message: 'You are not allowed to assign tasks to one or more of these users', status: 403 } };
      }
    }

    const assignerFields = { id: assigner.id, name: assigner.name ?? assigner.email ?? '', email: assigner.email ?? '' };
    const assigneeFields = assignees.map((a) => ({ id: a.id, name: a.name ?? a.email ?? '', email: a.email ?? '' }));

    if (recurrenceType) {
      const recurrenceEndDate = moment.tz(parsed.recurrenceEndDateStr, 'YYYY-MM-DD', timezone).endOf('day').toDate();
      const tasks = await recurringTaskController.createFromParsed({
        parsed,
        dueType,
        recurrenceType,
        recurrenceEndDate,
        assigner: assignerFields,
        assignees: assigneeFields,
        timezone,
      });
      return { data: tasks, message: tasks.length > 1 ? 'Tasks created' : 'Task created' };
    }

    const entries = await Promise.all(
      assignees.map(async (assignee) => ({
        title: parsed.title,
        description: parsed.perAssigneeDescription ? parsed.descriptions[assignee.id]!.trim() : parsed.description,
        dueDate: await resolveDueDate(dueType, assignee.id, parsed.dueDateStr),
        dueType,
        assigner: assignerFields,
        assignee: { id: assignee.id, name: assignee.name ?? assignee.email ?? '', email: assignee.email ?? '' },
      })),
    );

    const tasks = await taskModel.createForAssignees(entries);

    for (const task of tasks) {
      void fireTaskEvent('assigned', task.id, task.title, task.assigneeId, task.assigneeName, task.assigneeEmail, assigner.name ?? assigner.email ?? '').catch(() => {});
    }

    return { data: tasks, message: tasks.length > 1 ? 'Tasks created' : 'Task created' };
  }

  async update(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const task = await taskModel.findById(id);
    if (!task) return { error: { message: 'Task not found', status: 404 } };
    if (task.assignerId !== session.user.id) return { error: { message: 'Only the assigner can edit this task', status: 403 } };

    const b = body as Record<string, unknown>;
    const title = typeof b.title === 'string' ? b.title.trim() : undefined;
    const description = typeof b.description === 'string' ? b.description.trim() : undefined;
    const dueDateStr = typeof b.dueDate === 'string' ? b.dueDate.trim() : undefined;
    const dueTypeStr = typeof b.dueType === 'string' ? b.dueType.trim() : undefined;
    const newAssigneeId = typeof b.assigneeId === 'string' ? b.assigneeId.trim() : undefined;

    const errors: string[] = [];
    if (title !== undefined && !title) errors.push('title: Title is required');
    if (description !== undefined && !description) errors.push('description: Description is required');
    if (dueTypeStr !== undefined && !isTaskDueType(dueTypeStr)) errors.push('dueType: Invalid due type');
    const effectiveDueType: TaskDueType = dueTypeStr && isTaskDueType(dueTypeStr) ? dueTypeStr : task.dueType;
    if (effectiveDueType === 'CUSTOM' && dueDateStr !== undefined && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueDateStr)) {
      errors.push('dueDate: Valid due date and time is required');
    }
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    let assigneeFields: { assigneeId?: string; assigneeName?: string; assigneeEmail?: string } = {};
    if (newAssigneeId && newAssigneeId !== task.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: newAssigneeId }, select: { id: true, name: true, email: true } });
      if (!assignee) return { error: { message: 'Validation failed', errors: ['assigneeId: User not found'], status: 400 } };
      assigneeFields = { assigneeId: assignee.id, assigneeName: assignee.name ?? '', assigneeEmail: assignee.email ?? '' };
    }

    const assigneeChanged = Boolean(assigneeFields.assigneeId);
    const typeChangedToUrgent = dueTypeStr === 'URGENT' && task.dueType !== 'URGENT';
    const typeChangedToStandard = dueTypeStr === 'STANDARD' && task.dueType !== 'STANDARD';

    let dueDate: Date | undefined;
    if (effectiveDueType === 'URGENT' && (typeChangedToUrgent || assigneeChanged)) {
      dueDate = await computeUrgentDueDate(assigneeFields.assigneeId ?? task.assigneeId);
    } else if (typeChangedToStandard) {
      dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (effectiveDueType === 'CUSTOM' && dueDateStr) {
      dueDate = new Date(dueDateStr);
    }

    const updated = await taskModel.update(id, {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(dueTypeStr && isTaskDueType(dueTypeStr) ? { dueType: dueTypeStr } : {}),
      ...assigneeFields,
    });

    return { data: updated, message: 'Task updated' };
  }

  async delete(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const task = await taskModel.findById(id);
    if (!task) return { error: { message: 'Task not found', status: 404 } };
    if (task.assignerId !== session.user.id) return { error: { message: 'Only the assigner can delete this task', status: 403 } };
    await taskModel.delete(id);
    return { data: null, message: 'Task deleted' };
  }

  async complete(id: string, body: unknown, session: Session) {
    const task = await taskModel.findById(id);
    if (!task) return { error: { message: 'Task not found', status: 404 } };

    const uid = session.user.id;
    const canComplete =
      task.assigneeId === uid ||
      (isAdmin(session) && task.assignerId === uid);
    if (!canComplete) return { error: { message: 'Only the assignee can mark this task complete', status: 403 } };

    if (task.status === 'COMPLETED') return { error: { message: 'Task is already completed', status: 400 } };

    const b = body as Record<string, unknown>;
    const proofFiles = Array.isArray(b.proofFiles) ? (b.proofFiles as SavedFile[]) : [];

    const updated = await taskModel.markComplete(id, proofFiles);

    void fireTaskEvent('completed', task.id, task.title, task.assignerId, task.assignerName, task.assignerEmail, userName(session)).catch(() => {});

    return { data: updated, message: 'Task marked complete' };
  }

  async getMessages(id: string, session: Session) {
    const task = await taskModel.findById(id);
    if (!task) return { error: { message: 'Task not found', status: 404 } };

    const uid = session.user.id;
    if (uid !== task.assignerId && uid !== task.assigneeId && !isAdmin(session)) {
      return { error: { message: 'Forbidden', status: 403 } };
    }

    const field = uid === task.assigneeId ? 'lastReadByAssigneeAt' : 'lastReadByAssignerAt';
    void taskModel.touchRead(id, field).catch(() => {});

    const messages = await taskModel.listMessages(id);
    return { data: { messages, task }, message: 'Messages retrieved' };
  }

  async sendMessage(id: string, body: unknown, session: Session) {
    const task = await taskModel.findById(id);
    if (!task) return { error: { message: 'Task not found', status: 404 } };

    const uid = session.user.id;
    if (uid !== task.assignerId && uid !== task.assigneeId && !isAdmin(session)) {
      return { error: { message: 'Forbidden', status: 403 } };
    }

    const b = body as Record<string, unknown>;
    const message = String(b.message ?? '').trim();
    if (!message) return { error: { message: 'Validation failed', errors: ['message: Message is required'], status: 400 } };

    const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true } });
    if (!user) return { error: { message: 'User not found', status: 400 } };

    const msg = await taskModel.addMessage({
      taskId: id,
      senderId: uid,
      senderName: user.name ?? user.email ?? '',
      senderEmail: user.email ?? '',
      message,
    });

    const otherPartyId = uid === task.assigneeId ? task.assignerId : task.assigneeId;
    const otherPartyEmail = uid === task.assigneeId ? task.assignerEmail : task.assigneeEmail;

    void fireMessageEvent(task.id, task.title, message, otherPartyId, otherPartyEmail, user.name ?? user.email ?? '').catch(() => {});

    return { data: msg, message: 'Message sent' };
  }

  async mySummary(session: Session) {
    const summary = await taskModel.mySummary(session.user.id);
    return { data: summary, message: 'Summary retrieved' };
  }

  async report(searchParams: URLSearchParams, session: Session) {
    const admin = isAdmin(session);
    const filterUserId = admin
      ? (searchParams.get('assigneeId') ?? undefined)
      : session.user.id;
    const data = await taskModel.report(filterUserId);
    return { data, message: 'Report retrieved' };
  }

  async tabCounts(searchParams: URLSearchParams, session: Session) {
    const admin = isAdmin(session);
    const filterUserId = searchParams.get('assigneeId') ?? undefined;
    const scopeUserId = admin ? undefined : session.user.id;
    const [counts, recurring] = await Promise.all([
      taskModel.tabCounts(filterUserId, scopeUserId),
      recurringTaskModel.count({ assigneeId: filterUserId, scopeUserId }),
    ]);
    return { data: { ...counts, recurring }, message: 'Tab counts retrieved' };
  }

  async assignableUsers(session: Session) {
    const users = isAdmin(session)
      ? await prisma.user.findMany({
          where: { active: true },
          select: { id: true, name: true, email: true, role: true },
          orderBy: [{ name: 'asc' }, { email: 'asc' }],
        })
      : await getTaskVisibleUsers(session.user.id);
    return { data: users };
  }

}
