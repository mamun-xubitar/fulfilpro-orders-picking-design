import prisma from '@/lib/prisma.server';
import { toTaskRow, type TaskRow, type TaskWithMessages } from '@/models/task.model.server';
import { Prisma, TaskDueType, TaskRecurrenceType } from '@prisma/client';

export type RecurringTaskAssigneeRow = {
  id: string;
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  description: string;
  createdAt: string;
};

export type RecurringTaskRow = {
  id: string;
  title: string;
  description: string;
  dueType: TaskDueType;
  dueDate: string;
  recurrenceType: TaskRecurrenceType;
  recurrenceEndDate: string;
  stoppedAt: string | null;
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  assignees: RecurringTaskAssigneeRow[];
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

type RecurringTaskWithAssignees = {
  id: string;
  title: string;
  description: string;
  dueType: TaskDueType;
  dueDate: Date;
  recurrenceType: TaskRecurrenceType;
  recurrenceEndDate: Date;
  nextOccurrenceAt: Date;
  stoppedAt: Date | null;
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  createdAt: Date;
  updatedAt: Date;
  assignees: Array<{
    id: string;
    assigneeId: string;
    assigneeName: string;
    assigneeEmail: string;
    description: string;
    createdAt: Date;
  }>;
};

const GROUP_INCLUDE = {
  assignees: true,
  _count: { select: { tasks: true } },
} satisfies Prisma.RecurringTaskInclude;

type FindManyParams = {
  assigneeId?: string;
  scopeUserId?: string;
  search?: string;
  dueType?: TaskDueType;
  page: number;
  pageSize: number;
};

function buildRecurringWhere(params: Omit<FindManyParams, 'page' | 'pageSize'>): Prisma.RecurringTaskWhereInput {
  const where: Prisma.RecurringTaskWhereInput = {};
  const and: Prisma.RecurringTaskWhereInput[] = [];

  if (params.assigneeId) and.push({ assignees: { some: { assigneeId: params.assigneeId } } });
  if (params.scopeUserId) {
    and.push({ OR: [{ assignerId: params.scopeUserId }, { assignees: { some: { assigneeId: params.scopeUserId } } }] });
  }
  if (params.dueType) where.dueType = params.dueType;
  if (params.search) {
    const s = { contains: params.search, mode: 'insensitive' as const };
    and.push({ OR: [{ id: s }, { title: s }, { description: s }] });
  }

  if (and.length) where.AND = and;
  return where;
}

export class RecurringTaskModel {
  async createWithTasks(params: {
    group: {
      title: string;
      description: string;
      dueType: TaskDueType;
      dueDate: Date;
      recurrenceType: TaskRecurrenceType;
      recurrenceEndDate: Date;
      nextOccurrenceAt: Date;
      assigner: { id: string; name: string; email: string };
    };
    assignees: Array<{ id: string; name: string; email: string; description: string; dueDate: Date }>;
  }): Promise<{ group: RecurringTaskRow; tasks: TaskRow[] }> {
    const { group, assignees } = params;

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.recurringTask.create({
        data: {
          title: group.title,
          description: group.description,
          dueType: group.dueType,
          dueDate: group.dueDate,
          recurrenceType: group.recurrenceType,
          recurrenceEndDate: group.recurrenceEndDate,
          nextOccurrenceAt: group.nextOccurrenceAt,
          assignerId: group.assigner.id,
          assignerName: group.assigner.name,
          assignerEmail: group.assigner.email,
          assignees: {
            create: assignees.map((a) => ({
              assigneeId: a.id,
              assigneeName: a.name,
              assigneeEmail: a.email,
              description: a.description,
            })),
          },
        },
        include: GROUP_INCLUDE,
      });

      const tasks: TaskWithMessages[] = [];
      for (const a of assignees) {
        tasks.push(
          await tx.task.create({
            data: {
              title: group.title,
              description: a.description,
              dueDate: a.dueDate,
              dueType: group.dueType,
              assignerId: group.assigner.id,
              assignerName: group.assigner.name,
              assignerEmail: group.assigner.email,
              assigneeId: a.id,
              assigneeName: a.name,
              assigneeEmail: a.email,
              recurringTaskId: created.id,
            },
            include: { messages: { select: { senderId: true, createdAt: true } } },
          }),
        );
      }

      return { created, tasks };
    });

    return {
      group: toRecurringTaskRow(result.created, result.created._count.tasks),
      tasks: result.tasks.map((t) => toTaskRow(t, group.assigner.id)),
    };
  }

  async findMany(params: FindManyParams): Promise<{ total: number; tasks: RecurringTaskRow[] }> {
    const where = buildRecurringWhere(params);
    const [total, rows] = await Promise.all([
      prisma.recurringTask.count({ where }),
      prisma.recurringTask.findMany({
        where,
        include: GROUP_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return { total, tasks: rows.map((row) => toRecurringTaskRow(row, row._count.tasks)) };
  }

  async count(params: { assigneeId?: string; scopeUserId?: string }): Promise<number> {
    return prisma.recurringTask.count({ where: buildRecurringWhere(params) });
  }

  async findById(id: string): Promise<RecurringTaskRow | null> {
    const row = await prisma.recurringTask.findUnique({ where: { id }, include: GROUP_INCLUDE });
    return row ? toRecurringTaskRow(row, row._count.tasks) : null;
  }

  async findTasks(recurringTaskId: string, viewerId: string, onlyAssigneeId?: string): Promise<TaskRow[]> {
    const rows = await prisma.task.findMany({
      where: { recurringTaskId, ...(onlyAssigneeId ? { assigneeId: onlyAssigneeId } : {}) },
      include: { messages: { select: { senderId: true, createdAt: true } } },
      orderBy: { dueDate: 'desc' },
    });
    return rows.map((row) => toTaskRow(row, viewerId));
  }

  async addAssigneeWithTask(
    id: string,
    assignee: { id: string; name: string; email: string; description: string },
    task: { title: string; dueType: TaskDueType; dueDate: Date; assigner: { id: string; name: string; email: string } },
  ): Promise<{ group: RecurringTaskRow; task: TaskRow }> {
    const result = await prisma.$transaction(async (tx) => {
      await tx.recurringTaskAssignee.create({
        data: {
          recurringTaskId: id,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          assigneeEmail: assignee.email,
          description: assignee.description,
        },
      });

      const createdTask = await tx.task.create({
        data: {
          title: task.title,
          description: assignee.description,
          dueDate: task.dueDate,
          dueType: task.dueType,
          assignerId: task.assigner.id,
          assignerName: task.assigner.name,
          assignerEmail: task.assigner.email,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          assigneeEmail: assignee.email,
          recurringTaskId: id,
        },
        include: { messages: { select: { senderId: true, createdAt: true } } },
      });

      const group = await tx.recurringTask.findUniqueOrThrow({ where: { id }, include: GROUP_INCLUDE });
      return { group, task: createdTask };
    });

    return {
      group: toRecurringTaskRow(result.group, result.group._count.tasks),
      task: toTaskRow(result.task, task.assigner.id),
    };
  }

  async removeAssignee(id: string, assigneeId: string): Promise<RecurringTaskRow> {
    await prisma.recurringTaskAssignee.deleteMany({ where: { recurringTaskId: id, assigneeId } });
    const group = await prisma.recurringTask.findUniqueOrThrow({ where: { id }, include: GROUP_INCLUDE });
    return toRecurringTaskRow(group, group._count.tasks);
  }

  async stop(id: string): Promise<void> {
    await prisma.recurringTask.update({ where: { id }, data: { stoppedAt: new Date() } });
  }

  async resume(id: string, nextOccurrenceAt: Date): Promise<void> {
    await prisma.recurringTask.update({ where: { id }, data: { stoppedAt: null, nextOccurrenceAt } });
  }

  /** Deletes the recurring series definition. Tasks it already generated are not deleted —
   * Task.recurringTaskId is ON DELETE SET NULL, so they remain as ordinary, standalone tasks. */
  async delete(id: string): Promise<void> {
    await prisma.recurringTask.delete({ where: { id } });
  }

  async findActiveDueForGeneration(now: Date): Promise<RecurringTaskWithAssignees[]> {
    return prisma.recurringTask.findMany({
      where: {
        stoppedAt: null,
        nextOccurrenceAt: { lte: now },
        recurrenceEndDate: { gte: now },
      },
      include: { assignees: true },
    });
  }

  async createOccurrences(
    groupId: string,
    tasks: Array<{
      assigneeId: string;
      assigneeName: string;
      assigneeEmail: string;
      title: string;
      description: string;
      dueType: TaskDueType;
      dueDate: Date;
      assignerId: string;
      assignerName: string;
      assignerEmail: string;
    }>,
    nextOccurrenceAt: Date,
  ): Promise<TaskRow[]> {
    if (tasks.length === 0) {
      await prisma.recurringTask.update({ where: { id: groupId }, data: { nextOccurrenceAt } });
      return [];
    }

    const [...createdTasks] = await prisma.$transaction([
      ...tasks.map((t) =>
        prisma.task.create({
          data: {
            title: t.title,
            description: t.description,
            dueDate: t.dueDate,
            dueType: t.dueType,
            assignerId: t.assignerId,
            assignerName: t.assignerName,
            assignerEmail: t.assignerEmail,
            assigneeId: t.assigneeId,
            assigneeName: t.assigneeName,
            assigneeEmail: t.assigneeEmail,
            recurringTaskId: groupId,
          },
          include: { messages: { select: { senderId: true, createdAt: true } } },
        }),
      ),
      prisma.recurringTask.update({ where: { id: groupId }, data: { nextOccurrenceAt } }),
    ]);

    return (createdTasks.slice(0, tasks.length) as TaskWithMessages[]).map((row, i) => toTaskRow(row, tasks[i].assignerId));
  }
}

function toRecurringTaskRow(row: RecurringTaskWithAssignees, taskCount: number): RecurringTaskRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueType: row.dueType,
    dueDate: row.dueDate.toISOString(),
    recurrenceType: row.recurrenceType,
    recurrenceEndDate: row.recurrenceEndDate.toISOString(),
    stoppedAt: row.stoppedAt?.toISOString() ?? null,
    assignerId: row.assignerId,
    assignerName: row.assignerName,
    assignerEmail: row.assignerEmail,
    assignees: row.assignees.map((a) => ({
      id: a.id,
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
      assigneeEmail: a.assigneeEmail,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })),
    taskCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
