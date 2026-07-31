import prisma from '@/lib/prisma.server';
import { TaskModel, type TaskState2 } from '@/models/task.model.server';
import { createNotification } from '@/lib/notifications.server';
import { sendAppMail } from '@/lib/email.server';
import { computeUrgentDueDate } from '@/lib/auth-policy.server';
import { getTaskVisibleUserIds, getTaskVisibleUsers } from '@/lib/task-visibility.server';
import type { SavedFile } from '@/lib/uploads.server';
import type { TaskDueType } from '@prisma/client';

const taskModel = new TaskModel();
const DUE_TYPES: TaskDueType[] = ['STANDARD', 'URGENT', 'CUSTOM'];

function isTaskDueType(value: string): value is TaskDueType {
  return (DUE_TYPES as string[]).includes(value);
}

type Session = { user: { id: string; name?: string | null; email?: string | null; role?: string | null } };

function isAdmin(session: Session) {
  return session.user.role === 'admin';
}

function userName(session: Session) {
  return session.user.name ?? session.user.email ?? 'Unknown';
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
    const b = body as Record<string, unknown>;
    const title = String(b.title ?? '').trim();
    const description = String(b.description ?? '').trim();
    const dueDateStr = String(b.dueDate ?? '').trim();
    const dueTypeStr = String(b.dueType ?? '').trim();
    const assigneeId = String(b.assigneeId ?? '').trim();

    const errors: string[] = [];
    if (!title) errors.push('title: Title is required');
    if (!description) errors.push('description: Description is required');
    if (!dueTypeStr || !isTaskDueType(dueTypeStr)) errors.push('dueType: Due type is required');
    if (dueTypeStr === 'CUSTOM' && (!dueDateStr || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueDateStr))) {
      errors.push('dueDate: Valid due date and time is required');
    }
    if (!assigneeId) errors.push('assigneeId: Assignee is required');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const dueType = dueTypeStr as TaskDueType;

    const [assigner, assignee] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true } }),
      prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true, name: true, email: true } }),
    ]);
    if (!assigner) return { error: { message: 'Session user not found', status: 400 } };
    if (!assignee) return { error: { message: 'Validation failed', errors: ['assigneeId: User not found'], status: 400 } };
    if (!isAdmin(session)) {
      const visibleIds = await getTaskVisibleUserIds(session.user.id);
      if (!visibleIds.includes(assignee.id)) {
        return { error: { message: 'You are not allowed to assign tasks to this user', status: 403 } };
      }
    }

    const dueDate =
      dueType === 'STANDARD'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : dueType === 'URGENT'
        ? await computeUrgentDueDate(assigneeId)
        : new Date(dueDateStr);

    const task = await taskModel.create({
      title,
      description,
      dueDate,
      dueType,
      assigner: { id: assigner.id, name: assigner.name ?? assigner.email ?? '', email: assigner.email ?? '' },
      assignee: { id: assignee.id, name: assignee.name ?? assignee.email ?? '', email: assignee.email ?? '' },
    });

    void fireTaskEvent('assigned', task.id, task.title, task.assigneeId, task.assigneeName, task.assigneeEmail, assigner.name ?? assigner.email ?? '').catch(() => {});

    return { data: task, message: 'Task created' };
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
    const counts = await taskModel.tabCounts(filterUserId, scopeUserId);
    return { data: counts, message: 'Tab counts retrieved' };
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

async function fireTaskEvent(
  event: 'assigned' | 'completed',
  taskId: string,
  taskTitle: string,
  recipientId: string,
  recipientName: string,
  recipientEmail: string,
  actorName: string,
) {
  const isAssigned = event === 'assigned';
  const type = isAssigned ? 'task_assigned' : 'task_completed';
  const title = isAssigned ? 'New task assigned to you' : 'Task marked complete';
  const body = isAssigned
    ? `${actorName} assigned you a task: "${taskTitle}"`
    : `${actorName} completed the task: "${taskTitle}"`;
  const subject = isAssigned
    ? `You have a new task: ${taskTitle}`
    : `Task completed: ${taskTitle}`;
  const html = buildTaskEmail({ taskId, taskTitle, body, recipientName });

  await Promise.all([
    sendAppMail({ to: [recipientEmail], subject, html, text: body }).catch(() => {}),
    createNotification({ recipientId, type, title, body, taskId }),
  ]);
}

async function fireMessageEvent(
  taskId: string,
  taskTitle: string,
  messageText: string,
  recipientId: string,
  recipientEmail: string,
  senderName: string,
) {
  const body = `${senderName} sent a message on task "${taskTitle}": ${messageText.slice(0, 120)}`;
  const subject = `New message on task: ${taskTitle}`;
  const html = buildTaskEmail({ taskId, taskTitle, body, recipientName: '' });

  await Promise.all([
    sendAppMail({ to: [recipientEmail], subject, html, text: body }).catch(() => {}),
    createNotification({ recipientId, type: 'task_message', title: 'New task message', body, taskId }),
  ]);
}

function buildTaskEmail(params: { taskId: string; taskTitle: string; body: string; recipientName: string }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
      <h2 style="font-size:16px;margin-bottom:8px">${escapeHtml(params.taskTitle)}</h2>
      <p style="color:#555;margin:0 0 16px">${escapeHtml(params.body)}</p>
      <p style="font-size:12px;color:#888">Task ID: ${escapeHtml(params.taskId)}</p>
    </div>`;
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
