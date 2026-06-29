import prisma from '@/lib/prisma.server';
import { type SavedFile } from '@/lib/uploads.server';
import { deriveTaskState, completionLateness, type TaskState } from '@/lib/utils/task-status';
import { Prisma, TaskStatus } from '@prisma/client';

export type TaskMessageRow = {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  state: TaskState;
  dueDate: string;
  completedAt: string | null;
  proofFiles: SavedFile[];
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  unreadCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TabCounts = {
  total: number;
  pending: number;
  overdue: number;
  seriouslyLate: number;
  completed: number;
};

export type ReportRow = {
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  count: number;
  avgMinutes: number;
  onTime: number;
  overdue: number;
  seriouslyLate: number;
};

export type ReportData = {
  overallAvgMinutes: number;
  totalCompleted: number;
  byAssignee: ReportRow[];
};

export type TaskState2 = 'all' | 'pending' | 'overdue' | 'seriously_late' | 'completed';

type TaskWithMessages = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date;
  completedAt: Date | null;
  proofFiles: Prisma.JsonValue;
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  lastReadByAssignerAt: Date | null;
  lastReadByAssigneeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{ senderId: string; createdAt: Date }>;
};

export class TaskModel {
  async list(params: {
    assigneeId?: string;
    state?: TaskState2;
    search?: string;
    page: number;
    pageSize: number;
    viewerId: string;
  }) {
    const where = buildWhere(params);

    if (
      params.state === 'pending' ||
      params.state === 'overdue' ||
      params.state === 'seriously_late'
    ) {
      const allRows = await prisma.task.findMany({
        where,
        include: { messages: { select: { senderId: true, createdAt: true } } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      });
      const filtered = allRows.filter(
        (row) => deriveTaskState(row.status, row.dueDate) === params.state,
      );
      const total = filtered.length;
      const page = filtered.slice(
        (params.page - 1) * params.pageSize,
        params.page * params.pageSize,
      );
      return { total, tasks: page.map((row) => toTaskRow(row, params.viewerId)) };
    }

    const [total, rows] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: { messages: { select: { senderId: true, createdAt: true } } },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return { total, tasks: rows.map((row) => toTaskRow(row, params.viewerId)) };
  }

  async findById(id: string): Promise<TaskRow | null> {
    const row = await prisma.task.findUnique({
      where: { id },
      include: { messages: { select: { senderId: true, createdAt: true } } },
    });
    return row ? toTaskRow(row, '') : null;
  }

  async create(data: {
    title: string;
    description: string;
    dueDate: Date;
    assigner: { id: string; name: string; email: string };
    assignee: { id: string; name: string; email: string };
  }) {
    const row = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        assignerId: data.assigner.id,
        assignerName: data.assigner.name,
        assignerEmail: data.assigner.email,
        assigneeId: data.assignee.id,
        assigneeName: data.assignee.name,
        assigneeEmail: data.assignee.email,
      },
      include: { messages: { select: { senderId: true, createdAt: true } } },
    });
    return toTaskRow(row, data.assigner.id);
  }

  async update(
    id: string,
    data: { title?: string; description?: string; dueDate?: Date; assigneeId?: string; assigneeName?: string; assigneeEmail?: string },
  ) {
    const row = await prisma.task.update({
      where: { id },
      data,
      include: { messages: { select: { senderId: true, createdAt: true } } },
    });
    return toTaskRow(row, row.assignerId);
  }

  async delete(id: string) {
    await prisma.task.delete({ where: { id } });
  }

  async markComplete(id: string, proofFiles: SavedFile[]) {
    const row = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        proofFiles: proofFiles as unknown as Prisma.InputJsonValue,
      },
      include: { messages: { select: { senderId: true, createdAt: true } } },
    });
    return toTaskRow(row, row.assigneeId);
  }

  async listMessages(taskId: string): Promise<TaskMessageRow[]> {
    const rows = await prisma.taskMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMessageRow);
  }

  async addMessage(data: {
    taskId: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    message: string;
  }): Promise<TaskMessageRow> {
    const row = await prisma.taskMessage.create({ data });
    return toMessageRow(row);
  }

  async touchRead(taskId: string, field: 'lastReadByAssignerAt' | 'lastReadByAssigneeAt') {
    await prisma.task.update({ where: { id: taskId }, data: { [field]: new Date() } });
  }

  async tabCounts(filterUserId?: string): Promise<TabCounts> {
    const baseWhere: Prisma.TaskWhereInput = filterUserId ? { assigneeId: filterUserId } : {};

    const [completedCount, pendingRows] = await Promise.all([
      prisma.task.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
      prisma.task.findMany({
        where: { ...baseWhere, status: 'PENDING' },
        select: { dueDate: true },
      }),
    ]);

    let pending = 0;
    let overdue = 0;
    let seriouslyLate = 0;
    for (const { dueDate } of pendingRows) {
      const state = deriveTaskState('PENDING', dueDate);
      if (state === 'pending') pending++;
      else if (state === 'overdue') overdue++;
      else seriouslyLate++;
    }

    return {
      total: completedCount + pendingRows.length,
      pending,
      overdue,
      seriouslyLate,
      completed: completedCount,
    };
  }

  async mySummary(assigneeId: string): Promise<{ pending: number; overdue: number; seriouslyLate: number }> {
    const rows = await prisma.task.findMany({
      where: { assigneeId, status: 'PENDING' },
      select: { dueDate: true },
    });
    let pending = 0;
    let overdue = 0;
    let seriouslyLate = 0;
    for (const { dueDate } of rows) {
      const state = deriveTaskState('PENDING', dueDate);
      if (state === 'pending') pending++;
      else if (state === 'overdue') overdue++;
      else seriouslyLate++;
    }
    return { pending, overdue, seriouslyLate };
  }

  async report(assigneeId?: string): Promise<ReportData> {
    const completed = await prisma.task.findMany({
      where: { status: 'COMPLETED', completedAt: { not: null }, ...(assigneeId ? { assigneeId } : {}) },
      select: {
        assigneeId: true,
        assigneeName: true,
        assigneeEmail: true,
        dueDate: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (completed.length === 0) {
      return { overallAvgMinutes: 0, totalCompleted: 0, byAssignee: [] };
    }

    const totalMs = completed.reduce(
      (sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()),
      0,
    );
    const overallAvgMinutes = totalMs / completed.length / 60_000;

    const byAssigneeMap = new Map<
      string,
      { name: string; email: string; count: number; totalMs: number; onTime: number; overdue: number; seriouslyLate: number }
    >();
    for (const t of completed) {
      const entry = byAssigneeMap.get(t.assigneeId) ?? {
        name: t.assigneeName,
        email: t.assigneeEmail,
        count: 0,
        totalMs: 0,
        onTime: 0,
        overdue: 0,
        seriouslyLate: 0,
      };
      entry.count++;
      entry.totalMs += t.completedAt!.getTime() - t.createdAt.getTime();
      const lateness = completionLateness(t.dueDate, t.completedAt!);
      if (lateness === 'on_time') entry.onTime++;
      else if (lateness === 'overdue') entry.overdue++;
      else entry.seriouslyLate++;
      byAssigneeMap.set(t.assigneeId, entry);
    }

    const byAssignee: ReportRow[] = Array.from(byAssigneeMap.entries()).map(([id, d]) => ({
      assigneeId: id,
      assigneeName: d.name,
      assigneeEmail: d.email,
      count: d.count,
      avgMinutes: d.totalMs / d.count / 60_000,
      onTime: d.onTime,
      overdue: d.overdue,
      seriouslyLate: d.seriouslyLate,
    }));

    return { overallAvgMinutes, totalCompleted: completed.length, byAssignee };
  }

  async pendingForAllAssignees(): Promise<
    Array<{ assigneeId: string; assigneeName: string; assigneeEmail: string; pending: number; overdue: number; seriouslyLate: number }>
  > {
    const rows = await prisma.task.findMany({
      where: { status: 'PENDING' },
      select: { assigneeId: true, assigneeName: true, assigneeEmail: true, dueDate: true },
    });

    const byAssignee = new Map<
      string,
      { name: string; email: string; pending: number; overdue: number; seriouslyLate: number }
    >();
    for (const row of rows) {
      const entry = byAssignee.get(row.assigneeId) ?? {
        name: row.assigneeName,
        email: row.assigneeEmail,
        pending: 0,
        overdue: 0,
        seriouslyLate: 0,
      };
      const state = deriveTaskState('PENDING', row.dueDate);
      if (state === 'pending') entry.pending++;
      else if (state === 'overdue') entry.overdue++;
      else entry.seriouslyLate++;
      byAssignee.set(row.assigneeId, entry);
    }

    return Array.from(byAssignee.entries()).map(([id, d]) => ({
      assigneeId: id,
      assigneeName: d.name,
      assigneeEmail: d.email,
      pending: d.pending,
      overdue: d.overdue,
      seriouslyLate: d.seriouslyLate,
    }));
  }
}

function buildWhere(params: { assigneeId?: string; state?: TaskState2; search?: string }) {
  const where: Prisma.TaskWhereInput = {};

  if (params.assigneeId) where.assigneeId = params.assigneeId;

  if (params.state === 'completed') {
    where.status = 'COMPLETED';
  } else if (
    params.state === 'pending' ||
    params.state === 'overdue' ||
    params.state === 'seriously_late'
  ) {
    where.status = 'PENDING';
  }

  if (params.search) {
    const s = { contains: params.search, mode: 'insensitive' as const };
    where.OR = [{ id: s }, { title: s }, { description: s }];
  }

  return where;
}

function toTaskRow(row: TaskWithMessages, viewerId: string): TaskRow {
  const isAssignee = row.assigneeId === viewerId;
  const lastRead = isAssignee ? row.lastReadByAssigneeAt : row.lastReadByAssignerAt;
  const lastReadTime = lastRead?.getTime() ?? 0;
  const unreadCount = row.messages.filter(
    (m) => m.senderId !== viewerId && m.createdAt.getTime() > lastReadTime,
  ).length;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    state: deriveTaskState(row.status, row.dueDate),
    dueDate: row.dueDate.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    proofFiles: toSavedFiles(row.proofFiles),
    assignerId: row.assignerId,
    assignerName: row.assignerName,
    assignerEmail: row.assignerEmail,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
    unreadCount,
    messageCount: row.messages.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageRow(row: {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: Date;
}): TaskMessageRow {
  return {
    id: row.id,
    taskId: row.taskId,
    senderId: row.senderId,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSavedFiles(value: Prisma.JsonValue): SavedFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    const url = typeof obj.url === 'string' ? obj.url : '';
    if (!url) return [];
    return [{
      name: typeof obj.name === 'string' ? obj.name : '',
      url,
      size: typeof obj.size === 'number' ? obj.size : 0,
      mimeType: typeof obj.mimeType === 'string' ? obj.mimeType : '',
    }];
  });
}
